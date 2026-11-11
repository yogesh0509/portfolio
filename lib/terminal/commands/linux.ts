import { isSiteRepo } from "../../site";
import { closest } from "../suggest";
import { blank, bold, cmd, error, plain } from "../text";
import type { Command, Env, Line, Result } from "../types";
import { MIN_REPO_SHARE } from "../data";
import { formatDate, shortDate, versionOf } from "./shared";

const ok = (lines: Line[], extra: Partial<Result> = {}): Result => ({ lines, ...extra });

const uname: Command = {
  name: "uname",
  group: "linux",
  summary: "print system information",
  usage: "uname [-a | -r | -s | -m | -v | -n]",
  run(args, _s, env) {
    const { system } = env.data;
    const flags = new Set(args.flatMap((a) => (a.startsWith("-") ? [...a.slice(1)] : [])));
    if (flags.size === 0) return ok([plain("Linux")]);
    if (flags.has("a")) return ok([plain(`Linux ${system.host} ${system.kernel} ${system.kernelVersion} ${system.arch} ${system.arch} ${system.arch} GNU/Linux`)]);
    const parts: string[] = [];
    if (flags.has("s")) parts.push("Linux");
    if (flags.has("n")) parts.push(system.host);
    if (flags.has("r")) parts.push(system.kernel);
    if (flags.has("v")) parts.push(system.kernelVersion);
    if (flags.has("m")) parts.push(system.arch);
    return ok([plain(parts.join(" "))]);
  },
};

const date: Command = { name: "date", group: "linux", summary: "print the current date and time", run: (_a, _s, env) => ok([plain(formatDate(env.now()))]) };

const sudo: Command = {
  name: "sudo",
  group: "linux",
  summary: "run a command as another user",
  run: (_a, _s, env) => ({
    lines: [plain(`${env.data.system.user} is not in the sudoers file.  This incident will be reported.`)],
    status: 1,
  }),
};

const exit: Command = { name: "exit", aliases: ["logout"], group: "linux", summary: "close the terminal panel", run: () => ok([plain("logout")], { effects: [{ type: "closePanel" }] }) };

// ---------------------------------------------------------------------------------------------
// apt: languages are "packages", and the data behind them is the real GitHub snapshot.

const aptUsage = (env: Env): Result =>
  ok([
    plain(`apt ${env.data.system.aptVersion} (amd64)`),
    plain("Usage: apt list --installed | apt list --upgradable | apt show <language>"),
    blank(),
    plain("Languages are the packages: which of my public repositories use each one, from GitHub."),
  ]);

const aptDenied = (lock: string, extra: string[] = []): Result => ({
  lines: [error(`E: Could not open lock file ${lock} - open (13: Permission denied)`), ...extra.map(error)],
  status: 100,
});

const apt: Command = {
  name: "apt",
  aliases: ["apt-get"],
  group: "linux",
  summary: "list the languages I use, as installed packages",
  usage: "apt list --installed | apt list --upgradable | apt show <language>",
  complete: (args, _s, env) => {
    const last = args[args.length - 1] ?? "";
    if (args[0] === "show") return env.data.languages.map((l) => l.id).filter((id) => id.startsWith(last));
    if (args[0] === "list") return ["--installed", "--upgradable"].filter((f) => f.startsWith(last));
    return ["list", "show"].filter((s) => s.startsWith(last));
  },
  run(args, _s, env) {
    const { data } = env;
    const [sub, ...rest] = args;
    if (!sub || sub === "help" || sub === "--help") return aptUsage(env);

    if (sub === "list") {
      if (rest.includes("--upgradable")) {
        const cutoff = env.now().getTime() - 30 * 24 * 60 * 60 * 1000;
        const recent = data.repos.filter((r) => r.listed && !isSiteRepo(r.fullName) && Date.parse(r.pushedAt) >= cutoff).sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
        return ok([
          plain("Listing... Done"),
          ...recent.map((r): Line => [cmd(r.name, `gh repo view ${r.name}`), { text: `/github ${versionOf(r.pushedAt)} all [upgradable from: ${versionOf(r.createdAt)}]` }]),
        ]);
      }
      if (rest.includes("--installed") || rest.length === 0) {
        return ok([
          plain("Listing... Done"),
          ...data.languages.map((l): Line => [cmd(l.id, `apt show ${l.id}`), { text: `/github ${versionOf(l.lastPush)} all [installed]` }]),
        ]);
      }
      return { lines: [error(`E: Invalid operation list ${rest.join(" ")}`)], status: 100 };
    }

    if (sub === "show") {
      const wanted = rest[0]?.toLowerCase();
      if (!wanted) return { lines: [error("E: No packages found")], status: 100 };
      const lang = data.languages.find((l) => l.id === wanted || l.name.toLowerCase() === wanted);
      if (!lang) {
        const guess = closest(wanted, data.languages.map((l) => l.id));
        return { lines: [error(`E: No packages found`), ...(guess ? [[{ text: "Did you mean " }, cmd(guess, `apt show ${guess}`), { text: "?" }] as Line] : [])], status: 100 };
      }
      return ok([
        [bold("Package: "), { text: lang.id }],
        [bold("Version: "), { text: versionOf(lang.lastPush) }],
        [bold("Section: "), { text: "languages" }],
        [bold("Depends: "), ...lang.repos.flatMap((name, i) => [...(i > 0 ? [{ text: ", " }] : []), cmd(name, `gh repo view ${name}`)])],
        [bold("Description: "), { text: `${lang.name}, used in ${lang.repos.length} of my public ${lang.repos.length === 1 ? "repository" : "repositories"}` }],
        plain(` A language counts as used in a repository when it is at least ${Math.round(MIN_REPO_SHARE * 100)}% of that repository's code,`),
        plain(` by GitHub's per-language byte counts for my original (non-fork) repositories.`),
        plain(` I count repositories, not bytes, because byte counts include libraries committed into a repository.`),
        plain(` Last used: ${shortDate(lang.lastPush)}.`),
      ]);
    }

    if (sub === "update") return aptDenied("/var/lib/apt/lists/lock", ["W: Problem unlinking the file /var/cache/apt/pkgcache.bin - RemoveCaches (13: Permission denied)"]);
    if (["install", "upgrade", "remove", "purge", "dist-upgrade", "full-upgrade", "autoremove"].includes(sub)) {
      return aptDenied("/var/lib/dpkg/lock-frontend", ["E: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?"]);
    }
    return { lines: [error(`E: Invalid operation ${sub}`)], status: 100 };
  },
};

export const linuxCommands: Command[] = [uname, date, sudo, exit, apt];

/** Used by `which`, defined in the registry because it needs the whole command list. */
export const whichCommand = (list: () => Command[]): Command => ({
  name: "which",
  group: "linux",
  summary: "show where a command lives",
  usage: "which <command>",
  run(args) {
    const out: Line[] = [];
    let status = 0;
    for (const name of args) {
      const known = list().some((c) => c.name === name || c.aliases?.includes(name));
      if (known) out.push(plain(`/usr/local/bin/${name}`));
      else status = 1;
    }
    return { lines: out, status };
  },
});
