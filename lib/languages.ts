/** Shiki language ids the site highlights. `text` is rendered without highlighting. */
export type LangId =
  | "markdown"
  | "rust"
  | "solidity"
  | "cairo"
  | "typescript"
  | "javascript"
  | "json"
  | "toml"
  | "shellscript"
  | "python"
  | "video"
  | "text";

const BY_EXTENSION: Record<string, LangId> = {
  md: "markdown",
  rs: "rust",
  sol: "solidity",
  cairo: "cairo",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  json: "json",
  toml: "toml",
  sh: "shellscript",
  py: "python",
  mp4: "video",
};

/** Label shown in the status bar, as VS Code shows the language mode. */
export const LANG_LABEL: Record<LangId, string> = {
  markdown: "Markdown",
  rust: "Rust",
  solidity: "Solidity",
  cairo: "Cairo",
  typescript: "TypeScript",
  javascript: "JavaScript",
  json: "JSON",
  toml: "TOML",
  shellscript: "Shell Script",
  python: "Python",
  video: "Video",
  text: "Plain Text",
};

export function langFromFilename(name: string): LangId {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "text";
  return BY_EXTENSION[name.slice(dot + 1).toLowerCase()] ?? "text";
}
