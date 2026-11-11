import { renderMarkdown } from "@/lib/markdown/render.server";
import type { VfsFile } from "@/lib/vfs/types";
import CodeView from "./CodeView";
import VideoView from "./VideoView";
import ViewToggle from "./ViewToggle";

export default async function MarkdownView({ file }: { file: VfsFile }) {
  // A fetched README may have no top-level heading; the page still needs one for assistive technology.
  const needsHeading = !/^#\s/m.test(file.content);
  const preview = (
    <article className="md">
      {needsHeading && <h1 className="sr-only">{file.name}</h1>}
      {await renderMarkdown(file.content, file.source)}
      {file.video && (
        <section aria-labelledby="page-video">
          <h2 id="page-video">Video</h2>
          <VideoView key={file.path} video={file.video} />
        </section>
      )}
    </article>
  );
  const source = <CodeView code={file.content} lang="markdown" />;
  return <ViewToggle preview={preview} source={source} />;
}
