import type { LangId } from "../languages";
import type { VideoInfo } from "../video";

export interface FileLinks {
  /** Repository or file page on GitHub. */
  github?: string;
  /** Live deployment. */
  live?: string;
  /** Permalink to the exact commit and lines an excerpt was taken from. */
  permalink?: string;
}

/** Where a fetched README came from, so relative links and images can be rewritten. */
export interface MarkdownSource {
  repo: string;
  ref: string;
}

export interface VfsFile {
  kind: "file";
  name: string;
  /** Absolute VFS path, e.g. /projects/haystack/README.md. */
  path: string;
  /** Page URL. Equal to `path`, except the root README, which is "/". */
  url: string;
  lang: LangId;
  content: string;
  lines: number;
  /** Size in bytes (UTF-8), for `ls -l`. */
  size: number;
  links: FileLinks;
  source?: MarkdownSource;
  /**
   * On a `.mp4` file, the video it plays. On a folder's README, the same video, shown under the page. The
   * file's `content` is a plain-text description, which is what `cat` prints.
   */
  video?: VideoInfo;
}

export interface VfsDir {
  kind: "dir";
  name: string;
  path: string;
  children: VfsNode[];
}

export type VfsNode = VfsFile | VfsDir;

/** What the browser needs to draw the explorer and Quick Open: no file contents. */
export interface ExplorerNode {
  kind: "file" | "dir";
  name: string;
  path: string;
  url?: string;
  lang?: LangId;
  lines?: number;
  size?: number;
  links?: FileLinks;
  children?: ExplorerNode[];
}
