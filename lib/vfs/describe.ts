import type { VfsFile } from "./types";

/** Strips the markdown and HTML a README uses, leaving plain text. */
function plainText(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links keep their text
    .replace(/<[^>]+>/g, "") // inline HTML
    .replace(/[`*>#|]/g, "") // emphasis, code, quotes, headings, tables
    // Underscores are emphasis only at a word edge; inside an identifier (bdk_wallet) they are part of the name.
    .replace(/(^|[^A-Za-z0-9])_+|_+([^A-Za-z0-9]|$)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40))}…`;
}

/** A one-sentence description for the page's meta tags, taken from the page's own content. */
export function describeFile(file: Pick<VfsFile, "name" | "lang" | "content" | "links">): string {
  if (file.lang === "markdown") {
    let inFence = false;
    for (const raw of file.content.split("\n")) {
      const line = raw.trim();
      if (line.startsWith("```") || line.startsWith("~~~")) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue; // the inside of a code block is never a description
      if (line === "" || /^(#|---|\||[-*+] |\d+\. |<!--)/.test(line)) continue; // headings, rules, tables, lists, comments
      const text = plainText(line);
      if (text.length >= 20) return shorten(text);
    }
    return `${file.name} on yogesh0509`;
  }
  if (file.lang === "video") return `Video: ${file.content.split("\n")[0]}`;
  if (file.name === "resume.json") return "Résumé in JSON Resume format: experience, education, skills and links.";
  const source = /^(?:\/\/|#)\s*Source:\s+github\.com\/(\S+)/m.exec(file.content)?.[1];
  return source ? `Code excerpt from ${source}, pinned to a commit.` : `${file.name} on yogesh0509`;
}
