import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

/**
 * Reads the site's summary out of my GitHub profile README. The summary is the text between two
 * HTML comments, which GitHub does not display:
 *
 *   👋 Hey there! <!-- portfolio:summary -->I am a backend engineer in Bangalore.<!-- /portfolio:summary -->
 *
 * The text may use Markdown; links and emphasis keep only their words.
 */
const MARKERS = /<!--\s*portfolio:summary\s*-->([\s\S]*?)<!--\s*\/portfolio:summary\s*-->/g;

const SEPARATORS = new Set(["paragraph", "heading", "listItem", "blockquote", "tableCell", "break", "html", "thematicBreak"]);

export const SUMMARY_SNIPPET = "<!-- portfolio:summary -->Your summary here.<!-- /portfolio:summary -->";

export function extractSummary(readme: string): string {
  const matches = [...readme.matchAll(MARKERS)];
  if (matches.length !== 1) {
    throw new Error(
      // In backticks: the message is shown as Markdown, which would hide the HTML comments.
      `the profile README must contain exactly one marked summary, but has ${matches.length}. Wrap it like this: \`${SUMMARY_SNIPPET}\``,
    );
  }
  const tree = unified().use(remarkParse).parse(matches[0][1]);
  const parts: string[] = [];
  visit(tree, (node) => {
    if (node.type === "text" || node.type === "inlineCode") parts.push((node as { value: string }).value);
    // A block, a line break or raw HTML (a <br>, a nested comment) separates words; the HTML itself is dropped.
    else if (SEPARATORS.has(node.type)) parts.push(" ");
  });
  const text = parts.join("").replace(/\s+/g, " ").trim();
  if (text.length < 20 || text.length > 400) {
    throw new Error(`the marked summary is ${text.length} characters long; keep it between 20 and 400`);
  }
  return text;
}
