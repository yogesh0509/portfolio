'use client'

import { useState } from "react";
import { VscLinkExternal, VscPlay } from "react-icons/vsc";
import { describeVideo, embedUrl, PROVIDER_NAME, watchUrl, type VideoInfo } from "@/lib/video";

/**
 * A video that costs nothing until you press play. The page shows the title and a play button; the
 * provider's player is added only after the click, so no request goes to YouTube or Loom (and nothing is
 * stored by them) before then. The click also lets the browser start the sound.
 */
export default function VideoView({ video }: { video: VideoInfo }) {
  const [playing, setPlaying] = useState(false);
  const provider = PROVIDER_NAME[video.provider];
  const summary = describeVideo(video);

  return (
    <figure className="m-0 w-full max-w-3xl">
      <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-line bg-black">
        {playing ? (
          <iframe
            src={embedUrl(video, true)}
            title={video.title}
            className="absolute inset-0 size-full border-0"
            allow="autoplay; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            // The player may run its own scripts and open links in new tabs, but it cannot navigate this page.
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${video.title}`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white hover:bg-[#161616] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent"
          >
            <VscPlay aria-hidden className="text-6xl" />
            <span className="text-lg font-semibold leading-snug">{video.title}</span>
            <span className="text-xs text-fg-dim">
              {summary}. The player loads from {provider} when you press play.
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-dim">
        <span>
          {video.title} ({summary})
        </span>
        <a href={watchUrl(video)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#4daafc] underline underline-offset-2 hover:text-[#7cc1ff]">
          Watch on {provider}
          <VscLinkExternal aria-hidden />
        </a>
      </figcaption>
    </figure>
  );
}
