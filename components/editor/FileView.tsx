import type { VfsFile } from "@/lib/vfs/types";
import CodeView from "./CodeView";
import MarkdownView from "./MarkdownView";
import VideoView from "./VideoView";

export default async function FileView({ file }: { file: VfsFile }) {
  if (file.lang === "markdown") return <MarkdownView file={file} />;
  if (file.lang === "video" && file.video) {
    // Like VS Code's media preview: opening the file plays it. The key resets the player when the next video opens.
    return (
      <>
        <h1 className="sr-only">{file.name}</h1>
        <div className="p-4 sm:p-6">
          <VideoView key={file.path} video={file.video} />
        </div>
      </>
    );
  }
  return (
    <>
      {/* Every page needs a level-one heading; for a code file it is the file's name. */}
      <h1 className="sr-only">{file.name}</h1>
      <CodeView code={file.content} lang={file.lang} />
    </>
  );
}
