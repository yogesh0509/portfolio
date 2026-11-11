import { absolute, completePath, lookup } from "../fs";
import { splitFlags } from "../parse";
import { closest } from "../suggest";
import { blank, bold, color, columns, cmd, error, page, plain, lines as plainLines } from "../text";
import type { Command, Env, Line, Result, Span } from "../types";
import { homeDir } from "./shared";
import { parentOf } from "../../vfs/paths";
import type { ExplorerNode } from "../../vfs/types";

const ok = (lines: Line[], extra: Partial<Result> = {}): Result => ({ lines, ...extra });
const fail = (text: string, hint?: Span[]): Result => ({ lines: [error(text), ...(hint ? [hint] : [])], status: 1 });

/** "Did you mean 'projects'?" for a path whose last segment is a near miss of a real sibling. */
function didYouMean(env: Env, abs: string): Span[] | undefined {
  const parent = lookup(env.tree, parentOf(abs));
  if (!parent || parent.kind !== "dir") return undefined;
  const typed = abs.slice(abs.lastIndexOf("/") + 1);
  const names = (parent.children ?? []).map((c) => c.name);
  const guess = closest(typed, names);
  return guess ? [{ text: "Did you mean " }, cmd(`'${guess}'`, `cd ${parent.path === "/" ? "" : parent.path}/${guess}`), { text: "?" }] : undefined;
}

const entrySpan = (node: ExplorerNode, label = node.name): Span =>
  node.kind === "dir"
    ? { text: label, fg: "brightBlue", bold: true, run: `cd ${node.path}` }
    : { text: label, open: node.url ?? node.path };

function listDir(node: ExplorerNode, long: boolean): Line[] {
  const children = node.children ?? [];
  if (!long) {
    return [children.flatMap((c, i) => (i === 0 ? [entrySpan(c)] : [{ text: "  " }, entrySpan(c)]))];
  }
  const rows = children.map((c): Span[] => {
    const subdirs = c.kind === "dir" ? (c.children ?? []).filter((x) => x.kind === "dir").length : 0;
    return [
      { text: c.kind === "dir" ? "drwxr-xr-x" : "-rw-r--r--" },
      { text: String(c.kind === "dir" ? 2 + subdirs : 1) },
      { text: "yogesh0509" },
      { text: "yogesh0509" },
      { text: String(c.kind === "dir" ? 4096 : (c.size ?? 0)) },
      entrySpan(c),
    ];
  });
  // Right-align the numeric columns, like ls does.
  const width = (i: number) => Math.max(...rows.map((r) => r[i].text.length), 0);
  const [w1, w4] = [width(1), width(4)];
  const aligned = rows.map((r) => [r[0], { text: r[1].text.padStart(w1) }, r[2], r[3], { text: r[4].text.padStart(w4) }, r[5]]);
  return columns(aligned, 1);
}

const ls: Command = {
  name: "ls",
  group: "files",
  summary: "list files and folders",
  usage: "ls [-l] [path ...]",
  complete: (args, s, env) => completePath(env.tree, s.cwd, args[args.length - 1] ?? ""),
  run(args, session, env) {
    const { flags, operands } = splitFlags(args);
    const targets = operands.length === 0 ? ["."] : operands;
    const out: Line[] = [];
    let status = 0;
    targets.forEach((typed, index) => {
      const abs = absolute(session.cwd, typed);
      const node = lookup(env.tree, abs);
      if (!node) {
        out.push(error(`ls: cannot access '${typed}': No such file or directory`));
        const hint = didYouMean(env, abs);
        if (hint) out.push(hint);
        status = 2;
        return;
      }
      if (targets.length > 1) {
        if (index > 0) out.push(blank());
        out.push([bold(`${typed}:`)]);
      }
      out.push(...(node.kind === "dir" ? listDir(node, flags.has("-l")) : [[entrySpan(node, typed)]]));
    });
    return { lines: out, status };
  },
};

const cd: Command = {
  name: "cd",
  group: "files",
  summary: "change the current folder",
  usage: "cd [path]",
  complete: (args, s, env) => completePath(env.tree, s.cwd, args[args.length - 1] ?? "", true),
  run(args, session, env) {
    const typed = args[0] ?? "~";
    if (typed === "-") return fail("bash: cd: OLDPWD not set");
    const abs = absolute(session.cwd, typed);
    const node = lookup(env.tree, abs);
    if (!node) return { ...fail(`bash: cd: ${typed}: No such file or directory`, didYouMean(env, abs)) };
    if (node.kind !== "dir") return fail(`bash: cd: ${typed}: Not a directory`);
    return ok([], { effects: [{ type: "cd", path: node.path }] });
  },
};

const pwd: Command = {
  name: "pwd",
  group: "files",
  summary: "print the current folder",
  run: (_args, session, env) => ok([plain(`${homeDir(env.data.system)}${session.cwd === "/" ? "" : session.cwd}`)]),
};

const cat: Command = {
  name: "cat",
  group: "files",
  summary: "print a file",
  usage: "cat <file ...>",
  complete: (args, s, env) => completePath(env.tree, s.cwd, args[args.length - 1] ?? ""),
  async run(args, session, env) {
    if (args.length === 0) return fail("cat: missing file operand");
    const out: Line[] = [];
    let status = 0;
    for (const typed of args) {
      const abs = absolute(session.cwd, typed);
      if (abs.toLowerCase() === "/etc/os-release") {
        out.push(...plainLines(...env.data.system.osRelease));
        continue;
      }
      const node = lookup(env.tree, abs);
      if (!node) {
        out.push(error(`cat: ${typed}: No such file or directory`));
        const hint = didYouMean(env, abs);
        if (hint) out.push(hint);
        status = 1;
      } else if (node.kind === "dir") {
        out.push(error(`cat: ${typed}: Is a directory`));
        status = 1;
      } else {
        const text = await env.readFile(node.path);
        out.push(...plainLines(...(text ?? "").replace(/\n$/, "").split("\n")));
      }
    }
    return { lines: out, status };
  },
};

function treeLines(node: ExplorerNode, prefix = ""): { lines: Line[]; dirs: number; files: number } {
  const out: Line[] = [];
  let dirs = 0;
  let files = 0;
  const children = node.children ?? [];
  children.forEach((child, i) => {
    const last = i === children.length - 1;
    out.push([{ text: `${prefix}${last ? "`-- " : "|-- "}` }, entrySpan(child)]);
    if (child.kind === "dir") {
      dirs += 1;
      const inner = treeLines(child, `${prefix}${last ? "    " : "|   "}`);
      out.push(...inner.lines);
      dirs += inner.dirs;
      files += inner.files;
    } else {
      files += 1;
    }
  });
  return { lines: out, dirs, files };
}

const tree: Command = {
  name: "tree",
  group: "files",
  summary: "show folders as a tree",
  usage: "tree [path]",
  complete: (args, s, env) => completePath(env.tree, s.cwd, args[args.length - 1] ?? "", true),
  run(args, session, env) {
    const typed = args[0] ?? ".";
    const abs = absolute(session.cwd, typed);
    const node = lookup(env.tree, abs);
    if (!node) return fail(`${typed} [error opening dir]`);
    if (node.kind !== "dir") return ok([[entrySpan(node, typed)], blank(), plain("0 directories, 1 file")]);
    const { lines, dirs, files } = treeLines(node);
    return ok([[color(typed === "." ? "." : typed, "brightBlue", { bold: true })], ...lines, blank(), plain(`${dirs} ${dirs === 1 ? "directory" : "directories"}, ${files} ${files === 1 ? "file" : "files"}`)]);
  },
};

const open: Command = {
  name: "open",
  aliases: ["code", "xdg-open"],
  group: "files",
  summary: "open a file or project in the editor",
  usage: "open <file | folder | project>",
  complete: (args, s, env) => completePath(env.tree, s.cwd, args[args.length - 1] ?? ""),
  run(args, session, env) {
    if (args.length === 0) return fail("usage: open <file | folder | project>");
    const typed = args[0];
    let node = lookup(env.tree, absolute(session.cwd, typed));
    if (!node) {
      // `open haystack` works from anywhere, like the project names elsewhere.
      const wanted = typed.toLowerCase();
      const target = env.data.projects.find((p) => p.slug.toLowerCase() === wanted) ?? env.data.research.find((r) => r.slug.toLowerCase() === wanted);
      if (target) node = lookup(env.tree, target.path);
    }
    if (!node) return fail(`open: ${typed}: No such file or directory`, didYouMean(env, absolute(session.cwd, typed)));
    if (node.kind === "dir") {
      const readme = node.children?.find((c) => c.name === "README.md");
      if (!readme) return fail(`open: ${typed}: is a folder without a README; try 'ls ${typed}'`);
      node = readme;
    }
    const url = node.url ?? node.path;
    return ok([[{ text: "Opening " }, page(node.path.slice(1) || node.name, url)]], { effects: [{ type: "navigate", url }] });
  },
};

const clear: Command = { name: "clear", group: "files", summary: "clear the screen (Ctrl+L)", run: () => ok([], { effects: [{ type: "clear" }] }) };

const history: Command = {
  name: "history",
  group: "files",
  summary: "list the commands you have run",
  run: (_args, session) =>
    ok(session.history.map((entry, i) => [{ text: `${String(i + 1).padStart(4)}  ` }, cmd(entry)])),
};

const echo: Command = { name: "echo", group: "files", summary: "print text", usage: "echo [text ...]", run: (args) => ok([plain(args.join(" "))]) };

/** Real commands whose effect would change files: this file system is read-only. */
const readOnly = (name: string): Command => ({
  name,
  group: "linux",
  summary: `${name}: not available, the file system is read-only`,
  run: (args) => fail(`${name}: cannot modify '${args.filter((a) => !a.startsWith("-"))[0] ?? "."}': Read-only file system`),
});

export const fileCommands: Command[] = [ls, cd, pwd, cat, tree, open, clear, history, echo, ...["rm", "mv", "cp", "mkdir", "touch", "chmod"].map(readOnly)];

