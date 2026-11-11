## What it does

Windows Voice Access only understands a fixed command grammar, so a paraphrase like "pull up chrome real quick" fails. Jarvis accepts natural phrasing instead. It runs entirely on the laptop: no audio or text is sent anywhere.

A command starts in one of two ways.

1. Say "hey jarvis". A wake-word model hears it, and a voice activity detector (a model that decides when speech starts and stops) cuts out the command.
2. Hold Right Ctrl for at least one second (push-to-talk). This path skips the wake word and the echo cancellation, so it still works when they misbehave.

The command is transcribed locally with Whisper `small.en`. It then resolves to one of 25 actions in a fixed table. The actions open, focus, minimise or maximise one of 8 registered apps; switch to the next or previous virtual desktop; snap a window or move it to another monitor; control volume and media; set, list and cancel timers; report battery, memory and disk; take screenshots; say which windows are open on a screen; jump to a VS Code window by repository name; restart Explorer; and lock the PC. Inside a session, "start dictating" types what you say into the focused window until a stop phrase. Jarvis replies out loud with a Piper voice.

## How it works

**Two-stage intent resolution.** The fast path turns the transcript into an embedding (a vector of numbers where similar meanings sit close together) with `bge-small-en-v1.5`. It compares that with a few seed phrases for most actions. A similarity of 0.80 or more normally dispatches without the LLM; a guard sends question-shaped phrases to the LLM instead. Everything else goes to Qwen2.5-1.5B running in llama.cpp. A JSON-schema grammar forces its output to be an action name, a spoken reply, or `no_match` when the input looks like transcription noise. Three actions have no seed phrases and are reachable only through the LLM: maximise, count an app's windows, and focus a VS Code repository.

**The safety boundary is the action table.** Neither the matcher nor the LLM produces code or shell commands. They only pick a name from a fixed list, and dispatch looks it up in a table of plain Python functions. `validate_parsed` (the excerpt) re-checks the action, app and direction against the real lists, and declines an action that lacks its required parameter. The free-text reply is only ever spoken. "Close" in a command is mapped to minimise. The one action that closes windows is restart Explorer. There is no confirmation step, so nothing that deletes or sends is in the table.

**Hearing commands over music.** At first the wake word fired on Spotify lyrics. The fix captures what Windows is playing and subtracts it from the microphone signal with WebRTC's acoustic echo canceller (AEC3). While anything is playing, the wake word and in-session commands are blocked unless the canceller reports that it is covering the echo. A broken output meter or an error in the gate deliberately leaves it open, so the assistant is never left deaf. The repository's decision notes record one measurement on laptop speakers: the echo of a test clip fell from −37 dBFS to −86 dBFS (decibels below the loudest possible signal, so lower is quieter), and the wake-word score fell from 0.99 to 0.00.

**LLM latency.** The first LLM call in a process has to read the whole system prompt, about 20 ms per token on this laptop's CPU. Jarvis saves llama.cpp's state to one file, with a SHA-256 fingerprint of the prompt template that is checked on load; a changed template discards it. The decision notes record a cold call of 20.03 s becoming 2.46 to 2.83 s with the saved state. Replacing the full-vocabulary scores array in the saved state with a single row of zeros shrank the file from about 322 MB to about 25 MB.

**Lifecycle.** Three Windows Task Scheduler entries start Jarvis at logon, quit it when the PC sleeps and restart it on wake. A local control socket backs `jarvis status`, `pause`, `resume` and `quit`.

## How it was built

The repository says that Claude Code makes every change in it, and its `CLAUDE.md` holds the rules for that workflow. The design notes are in `docs/architecture.md` and one file per area in `docs/decisions/`, each recording what was tried and rejected. The suite has 625 test functions; all except the intent-matcher tests run without an audio device, a window manager or model weights.

## Status

It runs on one Windows laptop, as a single-user tool.

- It is Windows only and needs a native Windows Python, not WSL2.
- Model weights are not in the repository. Whisper, the embedder, the LLM and the Piper voices are downloaded by hand into `models/`; the wake-word and voice-activity models come through openWakeWord's downloader.
- Echo cancellation was measured on one output only, laptop speakers at 70% volume. HDMI, Bluetooth and earbuds are unmeasured, so the thresholds are provisional.
- Speech the PC did not play, such as a TV in another room, can still match a seed phrase at 0.80 and run a command.
- Every transcript is logged locally to `logs/session.jsonl`.
- The repository has no licence file.
