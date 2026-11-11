import { blank, bold, cmd, dim, plain } from "./text";
import { isSiteRepo } from "../site";
import { plural } from "./commands/shared";
import type { Env, Line } from "./types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sun Oct  5 10:00:00 2026", the format of the "Last login" line. */
function lastLogin(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, " ")} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} ${d.getUTCFullYear()}`;
}

/** The login message: the real system line, then pointers, then figures computed from GitHub data. */
export function motd(env: Env): Line[] {
  const { data } = env;
  const { system } = data;
  const cutoff = env.now().getTime() - 30 * 24 * 60 * 60 * 1000;
  const recent = data.repos.filter((r) => r.listed && !isSiteRepo(r.fullName) && Date.parse(r.pushedAt) >= cutoff).length;

  const out: Line[] = [
    [bold(`Welcome to ${system.os} (GNU/Linux ${system.kernel} ${system.arch})`)],
    blank(),
    [{ text: " * About:    " }, cmd("man yogesh")],
    [{ text: " * Projects: " }, cmd("ls projects")],
    [{ text: " * Try:      " }, cmd("run web3-dream11"), { text: "  " }, cmd("git log --oneline"), { text: "  " }, cmd("contact"), { text: "  " }, cmd("help")],
    blank(),
  ];
  if (recent > 0) {
    out.push(
      plain(`${plural(recent, "repository", "repositories")} ${recent === 1 ? "was" : "were"} updated in the last 30 days.`),
      [{ text: "To see them, run: " }, cmd("apt list --upgradable")],
      blank(),
    );
  }
  if (data.lastPush) out.push([dim(`Last login: ${lastLogin(data.lastPush)} from github.com`)]);
  return out;
}
