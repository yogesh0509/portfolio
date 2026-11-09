'use client'

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { complete } from "@/lib/terminal/complete";
import type { TerminalData } from "@/lib/terminal/data";
import { execute } from "@/lib/terminal/execute";
import { freshCursor, navigate, pushHistory, type HistoryCursor } from "@/lib/terminal/history";
import { motd } from "@/lib/terminal/motd";
import { chipsFor } from "@/lib/terminal/suggest";
import { plain } from "@/lib/terminal/text";
import type { Effect, Env, Line } from "@/lib/terminal/types";
import { displayPath, pathKey } from "@/lib/vfs/paths";
import { useWorkbench } from "../workbench/WorkbenchProvider";
import LineView, { Prompt } from "./LineView";

type Block =
  | { id: number; kind: "output"; lines: Line[] }
  | { id: number; kind: "command"; cwd: string; input: string; lines: Line[] | null };

// Data is fetched once per page load, the first time the terminal opens.
let dataPromise: Promise<TerminalData> | null = null;
let contentPromise: Promise<Record<string, string>> | null = null;

function fetchJson<T>(url: string, reset: () => void): Promise<T> {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }).catch((error) => {
    reset(); // allow a retry on the next use
    throw error;
  });
}
const loadData = () => (dataPromise ??= fetchJson<TerminalData>("/vfs/terminal.json", () => (dataPromise = null)));
const loadContent = () => (contentPromise ??= fetchJson<Record<string, string>>("/vfs/content.json", () => (contentPromise = null)));

export default function Terminal() {
  const router = useRouter();
  const wb = useWorkbench();
  const { tree, panel, closePanel, openPanel, maximizePanel } = wb;

  const [data, setData] = useState<TerminalData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [cwd, setCwd] = useState("/");
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState<HistoryCursor>(freshCursor([]));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastTab, setLastTab] = useState<string | null>(null);

  const idRef = useRef(0);
  const nextId = () => (idRef.current += 1);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const env: Env | null = useMemo(
    () =>
      data && {
        data,
        tree,
        readFile: async (path) => (await loadContent())[pathKey(path)] ?? null,
        fetch: (...args) => window.fetch(...args),
        now: () => new Date(),
      },
    [data, tree],
  );

  // Load the command data, then print the login message.
  useEffect(() => {
    let cancelled = false;
    loadData()
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setBlocks([{ id: nextId(), kind: "output", lines: motd({ data: loaded, tree, readFile: async () => null, fetch: (...args) => window.fetch(...args), now: () => new Date() }) }]);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tree]);

  // Keep the newest output in view by scrolling the panel's own scroller. scrollIntoView() would also scroll
  // every ancestor, including overflow:hidden ones, and shift the whole workbench out of the window.
  useEffect(() => {
    const scroller = endRef.current?.closest<HTMLElement>("[data-scroll-container]");
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [blocks]);

  const apply = useCallback(
    (effects: Effect[]) => {
      for (const effect of effects) {
        switch (effect.type) {
          case "clear":
            setBlocks([]);
            break;
          case "cd":
            setCwd(effect.path);
            break;
          case "navigate":
            router.push(effect.url);
            // On phones the panel covers the page, and a maximised panel hides the editor: reveal it.
            if (!window.matchMedia("(min-width: 768px)").matches) closePanel();
            else if (panel === "maximized") maximizePanel();
            break;
          case "closePanel":
            closePanel();
            break;
          case "openPanel":
            openPanel(effect.tab);
            break;
          case "copy":
            void navigator.clipboard?.writeText(effect.text).catch(() => {});
            break;
        }
      }
    },
    [router, closePanel, openPanel, maximizePanel, panel],
  );

  const submit = useCallback(
    async (raw: string) => {
      if (!env || busy) return;
      const id = nextId();
      const nextHistory = pushHistory(history, raw);
      setBlocks((b) => [...b, { id, kind: "command", cwd, input: raw, lines: null }]);
      setHistory(nextHistory);
      setCursor(freshCursor(nextHistory));
      setInput("");
      setLastTab(null);
      setBusy(true);
      try {
        const result = await execute(raw, { cwd, history: nextHistory }, env);
        setBlocks((b) => b.map((x) => (x.id === id && x.kind === "command" ? { ...x, lines: result.lines } : x)));
        if (result.effects) apply(result.effects);
      } finally {
        setBusy(false);
        // After a click on a chip or a link in the output, put the cursor back in the prompt. Only with a
        // mouse: on a touch screen, focusing the field would raise the keyboard on every tap.
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) inputRef.current?.focus();
      }
    },
    [env, busy, history, cwd, apply],
  );

  const handleTab = () => {
    if (!env) return;
    const result = complete(input, { cwd, history }, env);
    if (result.insert !== null) {
      setInput(input.slice(0, result.start) + result.insert);
      setLastTab(null);
    } else if (result.candidates.length > 1) {
      if (lastTab === input) {
        // A second Tab lists the candidates, like bash.
        setBlocks((b) => [...b, { id: nextId(), kind: "command", cwd, input, lines: [plain(result.candidates.join("  "))] }]);
        setLastTab(null);
      } else {
        setLastTab(input);
      }
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey && !event.altKey && !event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === "l") {
        event.preventDefault();
        setBlocks([]);
        return;
      }
      if (key === "c") {
        event.preventDefault();
        setBlocks((b) => [...b, { id: nextId(), kind: "command", cwd, input: `${input}^C`, lines: [] }]);
        setInput("");
        return;
      }
      if (key === "u") {
        event.preventDefault();
        const at = event.currentTarget.selectionStart ?? input.length;
        setInput(input.slice(at));
        return;
      }
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void submit(input);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const moved = navigate(history, cursor, event.key === "ArrowUp" ? "up" : "down", input);
      setInput(moved.value);
      setCursor(moved.cursor);
    } else if (event.key === "Tab") {
      event.preventDefault();
      handleTab();
    } else if (lastTab !== null) {
      setLastTab(null);
    }
  };

  // Clicking empty space focuses the prompt, unless the visitor is selecting text or clicking a link.
  const onContainerClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input")) return;
    if (window.getSelection()?.isCollapsed === false) return;
    inputRef.current?.focus();
  };

  if (loadFailed) {
    return (
      <p className="p-3 text-[#ef2929]">
        Could not load the terminal data. Reload the page to try again.
      </p>
    );
  }
  if (!env || !data) return <p className="p-3 text-[#bbbbbb]">Connecting…</p>;

  const { user, host } = data.system;
  const chips = busy ? [] : chipsFor({ cwd, history }, env);

  return (
    <div className="flex min-h-full flex-col px-3 py-2 caret-ubuntu" onClick={onContainerClick}>
      <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Terminal output">
        {blocks.map((block) => {
          if (block.kind === "output") {
            return block.lines.map((line, i) => <LineView key={`${block.id}-${i}`} line={line} run={submit} />);
          }
          return (
            <div key={block.id}>
              <div className="whitespace-pre-wrap break-words">
                <Prompt user={user} host={host} path={displayPath(block.cwd)} />
                {block.input}
              </div>
              {(block.lines ?? []).map((line, i) => (
                <LineView key={i} line={line} run={submit} />
              ))}
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="flex items-baseline"
      >
        <label htmlFor="terminal-input" className="sr-only">
          Terminal input. Type a command, or press Tab to complete.
        </label>
        <Prompt user={user} host={host} path={displayPath(cwd)} />
        <input
          id="terminal-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          // readOnly, not disabled: a disabled field loses focus, and the visitor would have to click again.
          readOnly={busy}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          className="min-w-0 flex-1 bg-transparent font-[inherit] text-inherit outline-none"
        />
      </form>

      {chips.length > 0 && (
        <div role="group" aria-label="Suggested commands" className="flex flex-wrap gap-2 pt-2">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => void submit(chip)}
              className="rounded-sm border border-white/25 px-2 py-0.5 text-xs text-[#eeeeec] hover:bg-white/10"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
