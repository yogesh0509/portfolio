# jarvis

Custom voice-control assistant for Windows. Built because Windows Voice
Access (Settings -> Accessibility -> Speech) only matches a fixed command
grammar -- natural paraphrasing fails there. This listens for a wake word
("hey jarvis") or a push-to-talk hotkey, transcribes locally, resolves the
phrase to one of a fixed set of allowlisted actions (a fast local embedding
matcher first, a local LLM fallback for anything it can't confidently
place), executes it, and replies out loud. Fully local/offline -- no cloud
dependency anywhere in the pipeline.

Runs as a **native Windows Python process** -- mic capture, global hotkeys,
window management, and autostart are all unavailable from WSL2. Always
invoke `.venv\Scripts\python.exe`, never bare `python` (on this machine it
resolves to the Microsoft Store stub).

## Setup

```powershell
cd D:\jarvis
.\.venv\Scripts\python.exe -m pip install -r requirements.txt --only-binary=llama_cpp_python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt   # adds ruff (pytest is already in requirements.txt)
```

`llama_cpp_python` must come from the prebuilt CPU wheel index: its sdist
bundles llama.cpp's full source tree, whose nested paths exceed Windows'
260-character `MAX_PATH` during extraction.

`livekit` is there for one thing: WebRTC's echo canceller, which lets "hey
jarvis" work over music and video (`echo_canceller.py`). It's local DSP from
a prebuilt wheel; nothing connects to a LiveKit server. If it fails to load,
Jarvis still runs and system audio simply pauses the wake word again.

### Fetching the models

None of the model weights are in this repo (`models/` is gitignored). Fetch
each one by hand into `models/<name>/` via PowerShell's `Invoke-WebRequest`,
**not** Python's HTTPS client, which gets reset on this machine. Required:

| Directory | What | Used by |
|---|---|---|
| `models/faster-whisper-small.en/` | faster-whisper `small.en`, CTranslate2 format | `main.py` (transcription) |
| `models/bge-small-en-v1.5-onnx-q/` | `BAAI/bge-small-en-v1.5`, ONNX, quantized | `local_embedder.py` (intent matcher) |
| `models/qwen2.5-1.5b-instruct-gguf/` | Qwen2.5-1.5B-Instruct, GGUF Q4_K_M | `llm_intent.py` (LLM fallback) |
| `models/piper-en_GB-northern_english_male-medium/` | Piper TTS voice (active) | `tts.py` |
| `models/piper-en_GB-alan-medium/` | Piper TTS voice (switchable fallback) | `tts.py` (`VOICE = "alan"`) |

openWakeWord's `hey_jarvis`, embedding and melspectrogram models and
`silero_vad.onnx` live in the package's `resources/models/` folder. The
package does not download them by itself; on a fresh venv fetch them once with
`.\.venv\Scripts\python.exe -c "import openwakeword.utils as u; u.download_models()"`
(GitHub release assets, not affected by the TLS problem).

## Starting Jarvis

```powershell
jarvis start      # launches it in its own themed, fullscreen terminal
jarvis status     # check what it's doing
jarvis pause      # mic off, stop listening entirely
jarvis resume     # bring it back
jarvis quit       # stop it completely
```

It also starts itself at Windows logon and after the machine wakes from
sleep -- see `scheduler/README.md`. What you can say, the wake-word and
push-to-talk flow, the state diagram and the full command reference are in
`USER_GUIDE.md`.

## Documentation

| File | Covers |
|---|---|
| `USER_GUIDE.md` | Day-to-day usage, the state diagram, troubleshooting, the `jarvis` command reference |
| `docs/architecture.md` | Pipeline, security boundary, threads, complete module list |
| `docs/decisions/` | One file per code area: what the design is, why, and what was rejected (indexed in `CLAUDE.md`) |
| `CLAUDE.md` | Rules and workflow for Claude Code, which makes all changes in this repo |
| `scheduler/README.md` | The Task Scheduler entries that start/stop Jarvis around logon and sleep/wake |

Tests: `.venv\Scripts\python.exe -m pytest` (no audio device or window
manager needed; `tests/test_intent_matcher.py` loads the local BGE model).
