import { describeVideo, formatDuration, PROVIDER_NAME } from "../../video";
import type { TerminalData, TerminalVideo } from "../data";
import { closest } from "../suggest";
import { blank, bold, cmd, dim, error, link, page, plain } from "../text";
import type { Command, Line, Result } from "../types";
import { squash } from "./shared";

const ok = (lines: Line[], extra: Partial<Result> = {}): Result => ({ lines, ...extra });

const describe = (v: TerminalVideo) => describeVideo({ provider: v.provider, id: "", title: v.title, seconds: v.seconds, by: v.by });

/** A video by its folder's name or its title; an unambiguous prefix of either also works. */
export function findVideo(data: TerminalData, query: string): TerminalVideo | null {
  const q = squash(query);
  if (q === "") return null;
  const names = (v: TerminalVideo) => [v.name, v.title].map(squash);
  const exact = data.videos.find((v) => names(v).includes(q));
  if (exact) return exact;
  const prefix = data.videos.filter((v) => names(v).some((n) => n.startsWith(q)));
  return prefix.length === 1 ? prefix[0] : null;
}

/** The videos in the folder the shell is in, or below it. */
const videosHere = (data: TerminalData, cwd: string) => data.videos.filter((v) => v.dir === cwd || v.dir.startsWith(`${cwd === "/" ? "" : cwd}/`));

export const watchCommand: Command = {
  name: "watch",
  aliases: ["mpv"],
  group: "work",
  summary: "play a talk or demo video in the editor",
  usage: "watch [name]",
  complete: (args, _s, env) => env.data.videos.map((v) => v.name).filter((n) => n.startsWith((args[args.length - 1] ?? "").toLowerCase())),
  run(args, session, env) {
    const { data } = env;
    if (data.videos.length === 0) return ok([plain("There are no videos yet.")]);

    let video: TerminalVideo | null = null;
    if (args.length > 0) {
      video = findVideo(data, args.join(" "));
      if (!video) {
        const guess = closest(args[0], data.videos.map((v) => v.name));
        return {
          lines: [error(`watch: no video named '${args.join(" ")}'`), ...(guess ? [[{ text: "Did you mean " }, cmd(guess, `watch ${guess}`), { text: "?" }] as Line] : [[{ text: "List them with " }, cmd("watch")] as Line])],
          status: 1,
        };
      }
    } else {
      // From inside a folder that has exactly one video, `watch` plays it.
      const here = videosHere(data, session.cwd);
      if (here.length === 1 && session.cwd !== "/") video = here[0];
    }

    if (!video) {
      const width = Math.max(...data.videos.map((v) => v.name.length));
      return ok([
        [bold("Videos"), { text: "  press play in the editor, or click a name", dim: true }],
        blank(),
        ...data.videos.map((v): Line => [{ text: "  " }, cmd(v.name, `watch ${v.name}`), { text: `${" ".repeat(width - v.name.length + 2)}${v.title} `, dim: false }, dim(`(${describe(v)})`)]),
      ]);
    }

    return ok(
      [
        [bold(video.title)],
        [dim(`  ${describe(video)}`)],
        [{ text: "  Opening " }, page(`~${video.path}`, video.path), { text: ": press play there. The player loads from " }, { text: PROVIDER_NAME[video.provider] }, { text: " only then." }],
        [{ text: "  Or watch it on " }, link(PROVIDER_NAME[video.provider], video.watchUrl), { text: `${video.seconds === undefined ? "" : ` (${formatDuration(video.seconds)})`}.` }],
      ],
      { effects: [{ type: "navigate", url: video.path }] },
    );
  },
};
