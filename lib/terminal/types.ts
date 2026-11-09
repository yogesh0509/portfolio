import type { ExplorerNode } from "../vfs/types";
import type { TerminalData } from "./data";

/** The 16 colours of Ubuntu's default terminal palette. */
export type Color =
  | "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white"
  | "brightBlack" | "brightRed" | "brightGreen" | "brightYellow" | "brightBlue" | "brightMagenta" | "brightCyan" | "brightWhite";

/** A run of text with one style. A span can also be a link or a click-to-run command. */
export interface Span {
  text: string;
  fg?: Color;
  bold?: boolean;
  dim?: boolean;
  underline?: boolean;
  /** External link, opened in a new tab. */
  href?: string;
  /** Site-internal page, opened in the editor. */
  open?: string;
  /** Clicking runs this command in the terminal. */
  run?: string;
}

export type Line = Span[];

/** What a command wants the surrounding UI to do besides printing. */
export type Effect =
  | { type: "clear" }
  | { type: "cd"; path: string }
  | { type: "navigate"; url: string }
  | { type: "closePanel" }
  | { type: "openPanel"; tab: "terminal" | "ports" }
  | { type: "copy"; text: string };

export interface Result {
  lines: Line[];
  effects?: Effect[];
  /** Exit status, shown by nothing but kept for `$?`-style logic. */
  status?: number;
}

export interface Env {
  data: TerminalData;
  /** Top-level entries of the virtual file system. */
  tree: ExplorerNode[];
  /** Contents of a file by VFS path, or null if it does not exist. */
  readFile: (path: string) => Promise<string | null>;
  /** Network access for the commands that read a chain. Injected so commands do not depend on the global fetch. */
  fetch: typeof fetch;
  now: () => Date;
}

export interface Session {
  cwd: string;
  history: string[];
}

export interface Command {
  name: string;
  aliases?: string[];
  summary: string;
  usage?: string;
  /** Help group, for the `help` listing. */
  group: "files" | "about" | "work" | "linux" | "chain";
  /** Candidate completions for the argument being typed. */
  complete?: (args: string[], session: Session, env: Env) => string[];
  run: (args: string[], session: Session, env: Env) => Result | Promise<Result>;
}
