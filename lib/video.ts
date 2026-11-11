/**
 * Videos: the two providers the site can embed, and the one place their addresses are read.
 * Pure functions with no imports, so the build, the config check and the browser all agree.
 */

export type VideoProvider = "youtube" | "loom";

export interface VideoRef {
  provider: VideoProvider;
  id: string;
}

/** What a page needs to show a video. */
export interface VideoInfo extends VideoRef {
  title: string;
  /** Length in seconds, when known. */
  seconds?: number;
  /** Channel or author when it is not me. */
  by?: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const LOOM_ID = /^[0-9a-f]{32}$/;

export const PROVIDER_NAME: Record<VideoProvider, string> = { youtube: "YouTube", loom: "Loom" };

/**
 * Where each provider's player is loaded from. YouTube's "no cookie" host is used so that nothing is
 * stored in the visitor's browser before they press play. The Content-Security-Policy in vercel.json must
 * list these origins in frame-src (next.config.ts checks that it does).
 */
export const EMBED_ORIGIN: Record<VideoProvider, string> = {
  youtube: "https://www.youtube-nocookie.com",
  loom: "https://www.loom.com",
};

/**
 * Reads a YouTube (youtu.be or youtube.com/watch) or Loom (loom.com/share or /embed) address. Anything
 * else throws, so a typo, a tracking-link wrapper or an unsupported site fails the build instead of
 * reaching a page. Extra query parameters, such as `?si=...`, are ignored.
 */
export function parseVideoUrl(raw: string): VideoRef {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Not a video address: ${JSON.stringify(raw)}`);
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.protocol === "https:") {
    if (host === "youtu.be" && parts.length === 1 && YOUTUBE_ID.test(parts[0])) return { provider: "youtube", id: parts[0] };
    const v = url.searchParams.get("v");
    if (host === "youtube.com" && parts.length === 1 && parts[0] === "watch" && v !== null && YOUTUBE_ID.test(v)) return { provider: "youtube", id: v };
    if (host === "loom.com" && parts.length === 2 && (parts[0] === "share" || parts[0] === "embed") && LOOM_ID.test(parts[1])) return { provider: "loom", id: parts[1] };
  }
  throw new Error(`Unsupported video address (use an https YouTube or Loom link): ${JSON.stringify(raw)}`);
}

/** The page to watch it on, for people who do not want to load the player here. */
export function watchUrl({ provider, id }: VideoRef): string {
  return provider === "youtube" ? `https://www.youtube.com/watch?v=${id}` : `https://www.loom.com/share/${id}`;
}

/**
 * The player's address. YouTube starts playing when `autoplay` is set, which is allowed because the page
 * only builds the player after a click. Loom's player ignores an autoplay parameter (checked in a
 * browser), so it shows its own play button once it has loaded.
 */
export function embedUrl({ provider, id }: VideoRef, autoplay: boolean): string {
  const base = `${EMBED_ORIGIN[provider]}/embed/${id}`;
  return provider === "youtube" ? `${base}?rel=0${autoplay ? "&autoplay=1" : ""}` : base;
}

/** The `.mp4` file a video is shown as, inside its folder. */
export const videoFileName = (spec: { file?: string }): string => spec.file ?? "demo.mp4";
export const videoPath = (spec: { dir: string; file?: string }): string => `${spec.dir}/${videoFileName(spec)}`;

/** 301 seconds becomes "5:01"; 2103 becomes "35:03"; 3723 becomes "1:02:03". */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** "Loom, 5:01" or "YouTube, Stability Nexus, 35:03": the short description shown with a video. */
export function describeVideo(video: VideoInfo): string {
  return [PROVIDER_NAME[video.provider], video.by, video.seconds === undefined ? undefined : formatDuration(video.seconds)].filter(Boolean).join(", ");
}
