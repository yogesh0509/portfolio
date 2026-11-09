import type { Color, Line, Span } from "./types";

/** Small builders so command code reads like the output it produces. */

export const plain = (text: string): Line => [{ text }];
export const blank = (): Line => [{ text: "" }];
export const lines = (...texts: string[]): Line[] => texts.map(plain);

export const color = (text: string, fg: Color, extra: Partial<Span> = {}): Span => ({ text, fg, ...extra });
export const bold = (text: string, fg?: Color): Span => ({ text, bold: true, fg });
export const dim = (text: string): Span => ({ text, dim: true });

/** Clicking runs a command in the terminal. */
export const cmd = (text: string, run: string = text, fg: Color = "brightCyan"): Span => ({ text, run, fg, underline: true });
/** Clicking opens a page in the editor. */
export const page = (text: string, open: string, fg: Color = "brightBlue"): Span => ({ text, open, fg, underline: true });
/** Clicking opens an external site in a new tab. */
export const link = (text: string, href: string = text): Span => ({ text, href, fg: "brightBlue", underline: true });

export const error = (text: string): Line => [color(text, "brightRed")];

/** "lang   12   name" style columns: pads every cell but the last to its column's width. */
export function columns(rows: Span[][], gap = 2): Line[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      if (i < row.length - 1) widths[i] = Math.max(widths[i] ?? 0, cell.text.length);
    });
  }
  return rows.map((row) =>
    row.flatMap((cell, i) => (i < row.length - 1 ? [cell, { text: " ".repeat(widths[i] - cell.text.length + gap) }] : [cell])),
  );
}

/** ISO timestamp to "2026-10-08". */
export const day = (iso: string) => iso.slice(0, 10);

/** Plain text of a line, for copying. */
export const textOf = (line: Line) => line.map((s) => s.text).join("");
export const allText = (ls: Line[]) => ls.map(textOf).join("\n");
