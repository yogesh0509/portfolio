import { chainCommands } from "./commands/chain";
import { fileCommands } from "./commands/files";
import { ghCommand } from "./commands/gh";
import { gitCommand } from "./commands/git";
import { infoCommands, manCommand } from "./commands/info";
import { legacyCommands } from "./commands/legacy";
import { linuxCommands, whichCommand } from "./commands/linux";
import { portsCommand, runCommand } from "./commands/run";
import { watchCommand } from "./commands/watch";
import { blank, bold, cmd, plain } from "./text";
import type { Command } from "./types";

/** What a click on a command name in `help` runs: a safe, useful example of it. */
const EXAMPLES: Record<string, string> = {
  ls: "ls",
  cd: "cd projects",
  pwd: "pwd",
  cat: "cat README.md",
  tree: "tree",
  open: "open README.md",
  clear: "clear",
  history: "history",
  echo: "echo hello",
  whoami: "whoami",
  neofetch: "neofetch",
  contact: "contact",
  resume: "resume",
  man: "man yogesh",
  run: "run web3-dream11",
  ports: "ports",
  git: "git log --oneline",
  gh: "gh pr list --merged",
  apt: "apt list --installed",
  "bitcoin-cli": "bitcoin-cli getblockcount",
  cast: "cast block-number",
  watch: "watch",
  starkli: "starkli block-number",
  uname: "uname -a",
  date: "date",
  sudo: "sudo ls",
  exit: "exit",
};

/** Real commands that exist for authenticity but are not worth listing in `help`. */
const HIDDEN = new Set(["curl", "npx", "rm", "mv", "cp", "mkdir", "touch", "chmod", "which", "echo"]);

const GROUPS: { id: Command["group"]; label: string }[] = [
  { id: "files", label: "Explore" },
  { id: "about", label: "About me" },
  { id: "work", label: "My work" },
  { id: "linux", label: "Linux" },
  { id: "chain", label: "Blockchain" },
];

const helpCommand: Command = {
  name: "help",
  aliases: ["?"],
  group: "about",
  summary: "list the commands",
  run() {
    const out = [[bold("Everything here is clickable. Click a command, or type it.")], blank()];
    const shown = commands.filter((c) => !HIDDEN.has(c.name));
    // One column width for every group, so the descriptions line up down the whole listing.
    const width = Math.max(...shown.map((c) => c.name.length));
    for (const group of GROUPS) {
      const members = shown.filter((c) => c.group === group.id);
      if (members.length === 0) continue;
      out.push([bold(group.label)]);
      for (const c of members) {
        out.push([{ text: "  " }, cmd(c.name, EXAMPLES[c.name] ?? `man ${c.name}`), { text: `${" ".repeat(width - c.name.length + 2)}${c.summary}`, dim: true }]);
      }
      out.push(blank());
    }
    out.push(plain("Tab completes names and paths. ↑ and ↓ browse your history. Ctrl+L clears the screen."));
    out.push([{ text: "Not sure where to start? Try " }, cmd("man yogesh"), { text: " or " }, cmd("run web3-dream11"), { text: "." }]);
    return { lines: out };
  },
};

const base: Command[] = [...fileCommands, ...infoCommands, runCommand, portsCommand, watchCommand, gitCommand, ghCommand, ...chainCommands, ...linuxCommands, ...legacyCommands];

/** Every command, in the order `help` lists them. */
export const commands: Command[] = [...base, manCommand(() => commands), whichCommand(() => commands), helpCommand];

export function findCommand(name: string): Command | undefined {
  const wanted = name.toLowerCase();
  return commands.find((c) => c.name === wanted || c.aliases?.includes(wanted));
}

/** Names offered by completion and used for "did you mean". Hidden commands still run. */
export const visibleNames = (): string[] =>
  commands.filter((c) => !HIDDEN.has(c.name)).flatMap((c) => [c.name, ...(c.aliases ?? []).filter((a) => a !== "?")]);
