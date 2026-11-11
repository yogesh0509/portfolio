import { lookup } from "./fs";
import type { Env, Session } from "./types";

/**
 * Edit distance between two strings: the fewest single-character insertions, deletions,
 * substitutions or swaps of two adjacent characters that turn a into b. Counting a swap as
 * one edit matters because most typos are swaps ("lgo" for "log").
 */
export function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** The candidate closest to `typed`, if it is close enough to be a plausible typo. */
export function closest(typed: string, candidates: string[]): string | null {
  const wanted = typed.toLowerCase();
  const limit = wanted.length <= 3 ? 1 : 2;
  let best: { name: string; distance: number } | null = null;
  for (const name of candidates) {
    const distance = levenshtein(wanted, name.toLowerCase());
    if (distance <= limit && (!best || distance < best.distance)) best = { name, distance };
  }
  return best?.name ?? null;
}

/** Clickable command suggestions shown under the prompt, matched to where the user is. */
export function chipsFor(session: Session, env: Env): string[] {
  if (session.cwd === "/") return ["help", "ls", "man yogesh", "git log --oneline", "neofetch", "contact"];
  const dir = lookup(env.tree, session.cwd);
  const project = env.data.projects.find((p) => session.cwd === p.path || session.cwd.startsWith(`${p.path}/`));
  const chips: string[] = [];
  if (dir?.children?.some((c) => c.name === "README.md")) chips.push("cat README.md");
  chips.push("ls");
  if (project) chips.push(project.live || project.local ? "run" : "gh repo view");
  if (env.data.videos.some((v) => v.dir === session.cwd)) chips.push("watch");
  chips.push("cd ..", "help");
  return chips;
}
