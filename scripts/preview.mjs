// Serves out/ the way Vercel serves a Next.js static export: the .html suffix is
// optional, so /projects/haystack/README.md finds README.md.html, and unknown
// paths get out/404.html with a 404 status.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "out");

// Send the same security headers Vercel will send (from vercel.json), so a Content-Security-Policy
// mistake shows up here, in the browser console, not only after a deploy.
const vercel = JSON.parse(await readFile(join(process.cwd(), "vercel.json"), "utf8").catch(() => "{}"));
const securityHeaders = Object.fromEntries(
  (vercel.headers ?? []).filter((h) => h.source === "/(.*)").flatMap((h) => h.headers.map(({ key, value }) => [key.toLowerCase(), value])),
);
const port = Number(process.env.PORT ?? 3000);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const base = join(root, clean);
  if (!base.startsWith(root)) return null;
  for (const candidate of [base, `${base}.html`, join(base, "index.html")]) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const file = await resolve(pathname);
  const target = file ?? join(root, "404.html");
  try {
    const body = await readFile(target);
    res.writeHead(file ? 200 : 404, { ...securityHeaders, "content-type": types[extname(target)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(500).end("out/ is missing: run `npm run build` first");
  }
}).listen(port, () => console.log(`Serving out/ at http://localhost:${port}`));
