/**
 * Pure path helpers for the virtual file system. The same code runs at build time
 * (page list) and in the browser (terminal `cd`, `cat`, tab completion), so it must
 * not touch the file system or any browser API.
 *
 * Paths are always absolute and use "/" as the separator. "/" is the root, which the
 * terminal shows as "~" (its home directory).
 */

/** Collapses ".", ".." and repeated slashes. ".." at the root stays at the root. */
export function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return "/" + parts.join("/");
}

/**
 * Resolves what the user typed against the current directory.
 * "~" and "~/x" are relative to the root; "/x" is absolute; anything else is
 * relative to `cwd`.
 */
export function resolvePath(cwd: string, input: string): string {
  const typed = input.trim();
  if (typed === "" || typed === "~") return "/";
  if (typed.startsWith("~/")) return normalizePath(typed.slice(1));
  if (typed.startsWith("/")) return normalizePath(typed);
  return normalizePath(`${cwd}/${typed}`);
}

/** Key used for lookups, so "Projects/Haystack" finds "/projects/haystack". */
export function pathKey(path: string): string {
  return normalizePath(path).toLowerCase();
}

export function basename(path: string): string {
  const normal = normalizePath(path);
  return normal === "/" ? "" : normal.slice(normal.lastIndexOf("/") + 1);
}

export function parentOf(path: string): string {
  const normal = normalizePath(path);
  const cut = normal.lastIndexOf("/");
  return cut <= 0 ? "/" : normal.slice(0, cut);
}

/** The prompt form of a path: "/" becomes "~", "/projects/x" becomes "~/projects/x". */
export function displayPath(path: string): string {
  const normal = normalizePath(path);
  return normal === "/" ? "~" : `~${normal}`;
}

/**
 * Top-level names that are real routes or generated files, so no VFS entry may use
 * them. Compared case-insensitively.
 */
export const RESERVED_TOP_LEVEL = [
  "resume",
  "vfs",
  "_next",
  "404",
  "robots.txt",
] as const;

export function isReservedTopLevel(name: string): boolean {
  return (RESERVED_TOP_LEVEL as readonly string[]).includes(name.toLowerCase());
}
