import type { TerminalData } from "../data";
import { formatMonth } from "../../vfs/build";
import { blank, bold, cmd, color, dim, link, page, plain } from "../text";
import type { Color, Command, Line, Result, Span } from "../types";
import { findProject, plural, shortDate, wrap } from "./shared";

const ok = (lines: Line[], extra: Partial<Result> = {}): Result => ({ lines, ...extra });

/** The current role, e.g. "Member of Technical Staff at athenahealth". */
export function currentRole(data: TerminalData): string | null {
  for (const entry of data.experience) {
    const role = entry.roles.find((r) => r.to === null);
    if (role) return `${role.title} at ${entry.org}`;
  }
  return null;
}

/** "Solidity (6 repos), TypeScript (5), Rust (2)": the languages used in the most of my public repositories. */
export function topLanguages(data: TerminalData, count: number): string {
  return data.languages
    .slice(0, count)
    .map((l, i) => `${l.name} (${l.repos.length}${i === 0 ? ` ${l.repos.length === 1 ? "repo" : "repos"}` : ""})`)
    .join(", ");
}

const whoami: Command = {
  name: "whoami",
  group: "about",
  summary: "who is this?",
  run: (_args, _s, env) =>
    ok([plain(env.data.system.user), [color(env.data.profile.name, "brightGreen", { bold: true }), { text: `, ${env.data.profile.headline}` }]]),
};

// Linked blocks: a chain, as a block explorer would draw it. Plain ASCII on purpose: the terminal
// font has no box-drawing glyphs, and a fallback font would give every row a different width.
const ART = [
  " +------+ ",
  " | 0x00 | ",
  " +--+---+ ",
  "    |     ",
  " +--+---+ ",
  " | 0x01 | ",
  " +--+---+ ",
  "    |     ",
  " +--+---+ ",
  " | 0x02 | ",
  " +------+ ",
];

const PALETTE: Color[] = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

const neofetch: Command = {
  name: "neofetch",
  group: "about",
  summary: "a summary of this machine and its owner",
  run(_args, _s, env) {
    const { data } = env;
    const { system, profile } = data;
    const role = currentRole(data);
    // Every original (non-fork) public repo I own. The site hides some of them from its listings, but that is
    // a presentation choice, not a fact about GitHub, so it does not change this count.
    const originals = data.repos.length;
    const info: Line[] = [
      [color(`${system.user}@${system.host}`, "brightGreen", { bold: true })],
      [{ text: "-".repeat(`${system.user}@${system.host}`.length) }],
      [color("OS", "brightGreen", { bold: true }), { text: `: ${system.os} ${system.arch} (WSL2)` }],
      [color("Kernel", "brightGreen", { bold: true }), { text: `: ${system.kernel}` }],
      ...(role ? [[color("Role", "brightGreen", { bold: true }), { text: `: ${role}` }] as Line] : []),
      [color("Repos", "brightGreen", { bold: true }), { text: `: ${originals} public, ` }, cmd(`${data.pullRequests.length} merged PRs`, "gh pr list --merged"), { text: " to other projects" }],
      [color("Languages", "brightGreen", { bold: true }), { text: `: ${topLanguages(data, 4)}` }],
      ...(data.lastPush ? [[color("Last push", "brightGreen", { bold: true }), { text: `: ${shortDate(data.lastPush)}` }] as Line] : []),
      [color("Contact", "brightGreen", { bold: true }), { text: ": " }, link(profile.email, `mailto:${profile.email}`)],
      [],
      PALETTE.map((c): Span => ({ text: "███", fg: c })),
    ];
    const rows = Math.max(ART.length, info.length);
    const out: Line[] = [];
    for (let i = 0; i < rows; i += 1) {
      const art: Span = { text: ART[i] ?? " ".repeat(ART[0].length), fg: "brightYellow" };
      out.push([art, { text: "   " }, ...(info[i] ?? [])]);
    }
    return ok(out);
  },
};

const contact: Command = {
  name: "contact",
  group: "about",
  summary: "how to reach me",
  run(_args, _s, env) {
    const { profile } = env.data;
    const row = (label: string, value: Span): Line => [color(label.padEnd(10), "brightGreen", { bold: true }), value];
    return ok([
      row("Email", link(profile.email, `mailto:${profile.email}`)),
      row("GitHub", link(profile.github.replace("https://", ""), profile.github)),
      row("LinkedIn", link(profile.linkedin.replace("https://www.", ""), profile.linkedin)),
      row("Résumé", page("/resume", "/resume")),
      ...(profile.resumeUrl ? [row("PDF", link(profile.resumeUrl))] : []),
    ]);
  },
};

const resume: Command = {
  name: "resume",
  aliases: ["cv"],
  group: "about",
  summary: "open the résumé",
  run: (_args, _s, env) =>
    ok(
      [[{ text: "Opening " }, page("/resume", "/resume")], ...(env.data.profile.resumeUrl ? [[{ text: "PDF: " }, link(env.data.profile.resumeUrl)] as Line] : [])],
      { effects: [{ type: "navigate", url: "/resume" }] },
    ),
};

// ---------------------------------------------------------------------------------------------
// man

const WIDTH = 72;
const INDENT = 7;

const section = (title: string): Line => [bold(title)];
const body = (text: string): Line[] => wrap(text, WIDTH, INDENT).map(plain);

function periodOf(entry: TerminalData["experience"][number]): string {
  return entry.roles.map((r) => `${r.title} (${formatMonth(r.from)} to ${r.to ? formatMonth(r.to) : "present"})`).join("; ");
}

function manYogesh(data: TerminalData): Line[] {
  const { profile } = data;
  const header = `YOGESH(1)${" ".repeat(24)}User Commands${" ".repeat(24)}YOGESH(1)`;
  const out: Line[] = [plain(header), blank(), section("NAME"), plain(`       yogesh - ${profile.headline}`), blank()];

  out.push(section("DESCRIPTION"), ...body(profile.summary), blank());

  out.push(section("EXPERIENCE"));
  for (const entry of data.experience) out.push(...body(`${entry.org}, ${entry.place}: ${periodOf(entry)}.`));
  out.push(blank());

  const openSource = data.projects.filter((p) => p.folder === "open-source");
  if (openSource.length > 0) {
    out.push(section("OPEN SOURCE"));
    for (const p of openSource) {
      const prs = data.pullRequests.filter((pr) => [p.repo, ...p.extraRepos].map((r) => r.toLowerCase()).includes(pr.repo.toLowerCase())).length;
      const suffix = prs > 0 ? ` ${plural(prs, "merged pull request")}.` : "";
      out.push(...body(`${p.title} (${p.period}): ${p.tagline}${suffix}`));
    }
    out.push(blank());
  }

  if (data.research.length > 0) {
    out.push(section("RESEARCH"));
    for (const r of data.research) out.push(...body(`${r.title} (${r.authors.join(", ")}): ${r.tagline} ${r.status}`));
    out.push(blank());
  }

  const own = data.projects.filter((p) => p.folder === "projects");
  if (own.length > 0) {
    out.push(section("PROJECTS"));
    for (const p of own) out.push(...body(`${p.title} (${p.period}): ${p.tagline}`));
    out.push(blank());
  }

  const hackathons = data.projects.filter((p) => p.folder === "hackathons");
  if (hackathons.length > 0) {
    out.push(section("HACKATHONS"));
    for (const p of hackathons) {
      const events = p.hackathons.map((h) => (h.result ? `${h.event}, ${h.result}` : h.event)).join("; ");
      out.push(...body(`${p.title} (${events}): ${p.tagline}`));
    }
    out.push(blank());
  }

  out.push(section("EDUCATION"));
  for (const e of data.education) out.push(...body(`${e.degree}, ${e.school}, ${e.from} to ${e.to}.`));
  out.push(blank());

  out.push(section("FILES"));
  // Two rows, so the folders fit the page's 72 columns.
  const folders = (names: string[]): Line => [{ text: "       " }, ...names.flatMap((name, i) => [...(i > 0 ? [{ text: "  " }] : []), cmd(`~/${name}`, `ls ${name}`)])];
  out.push(folders(["open-source", "research", "projects"]), folders(["hackathons", "experience", "archive"]), blank());

  out.push(section("SEE ALSO"));
  out.push([{ text: "       " }, cmd("git-log(1)", "git log --oneline"), { text: ", " }, cmd("gh(1)", "gh pr list --merged"), { text: ", " }, cmd("contact(1)", "contact"), { text: ", " }, cmd("neofetch(1)", "neofetch")], blank());

  out.push(section("AUTHOR"), plain(`       ${profile.name}`), blank());
  out.push([dim(`${data.build.branch}${data.build.commit ? ` ${data.build.commit.slice(0, 7)}` : ""}`.padEnd(WIDTH - 9)), dim("YOGESH(1)")]);
  return out;
}

export const manCommand = (list: () => Command[]): Command => ({
  name: "man",
  group: "about",
  summary: "read a manual page (try: man yogesh)",
  usage: "man <yogesh | command>",
  complete: (args) => ["yogesh", ...list().map((c) => c.name)].filter((n) => n.startsWith(args[args.length - 1] ?? "")),
  run(args, _s, env) {
    if (args.length === 0) return { lines: [plain("What manual page do you want?"), [{ text: "For example, try " }, cmd("man yogesh")]], status: 1 };
    const topic = args[0].toLowerCase();
    if (topic === "yogesh") return ok(manYogesh(env.data));
    const command = list().find((c) => c.name === topic || c.aliases?.includes(topic));
    if (command) {
      return ok([
        plain(`${command.name.toUpperCase()}(1)`),
        blank(),
        section("NAME"),
        plain(`       ${command.name} - ${command.summary}`),
        ...(command.usage ? [blank(), section("SYNOPSIS"), plain(`       ${command.usage}`)] : []),
        ...(command.aliases?.length ? [blank(), section("ALIASES"), plain(`       ${command.aliases.join(", ")}`)] : []),
      ]);
    }
    const project = findProject(env.data, topic);
    if (project) return ok([[{ text: `No manual entry for ${args[0]}. ` }, { text: "Try " }, cmd(`cat ~${project.path}/README.md`)]], { status: 16 });
    return { lines: [plain(`No manual entry for ${args[0]}`)], status: 16 };
  },
});

export const infoCommands: Command[] = [whoami, neofetch, contact, resume];
