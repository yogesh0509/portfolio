# portfolio-yogesh0509

My portfolio, built to look like VS Code connected to a WSL Ubuntu machine, because it shows code
first and decoration second. Projects are files in the language they are written in, the terminal
runs real commands against my real data, and every number on the site traces back to GitHub or to
a recording.

It is a fully static site (`output: "export"`), deployed on Vercel.

## Run it

Node 24 is required (`.nvmrc`).

```bash
npm ci
npm run dev        # development server
npm run build      # static export into out/
npm run preview    # serve out/ locally, with the production security headers
npm run lint
npm run typecheck
```

## How it works

```
content/config.ts ──┐                                      ┌─> explorer, tabs, Quick Open (Ctrl+P)
content/projects/*.md ├─> lib/vfs/build.ts ─> virtual ──────┼─> one static page per file
data/ (GitHub snapshot) ┘   (pure function)     file system ├─> terminal: ls, cd, cat, run, git log, ...
                                                            └─> sitemap, SHA256SUMS, /vfs/*.json
```

- **One source of truth.** `content/config.ts` lists who I am, the featured projects, the testnet
  contracts and which code to excerpt. `data/` holds what GitHub says, refreshed weekly. Nothing
  else lists a project, so there is one place to edit.
- **A virtual file system (VFS).** `lib/vfs/build.ts` turns the two inputs into a tree of files.
  Pages, the explorer, Quick Open and the terminal all read that tree, so they cannot disagree.
- **Real code, pinned.** Each project shows excerpts of code I wrote, fetched at a pinned commit
  and headed with a permalink to the exact lines.
- **A terminal that does things.** Commands are plain functions over data (`lib/terminal/`), tested
  without a browser. `run <project>` replays a recorded session; `cast call` reads my testnet
  contracts live; `sha256sum -c SHA256SUMS` re-hashes every file in your browser.
- **Highlighting at build time.** Shiki uses VS Code's own grammars, so colours match the editor,
  and none of it ships to the browser.

## Add or change a project

1. Add an entry to `projects` in `content/config.ts` (slug, title, one-sentence tagline, repo,
   stack, period). Optional: `live`, `local`, `contracts`, `recordings`, `excerpts`.
2. Write the page body in `content/projects/<slug>.md`. The facts table, the deployed-contracts
   table and the merged pull requests are generated.
3. For an excerpt, give the repo, path, **full commit SHA** and line range. Use a commit that is on
   the public remote. `pinnedOnPurpose` silences the stale warning when other people rewrote the
   file afterwards and the pinned version is the one to show.
4. Run `npm run sync`. It fetches every excerpt and fails if a SHA or line range does not exist.

EVM contract addresses must be EIP-55 checksummed or the build fails: a typo is caught, not shown.

## The GitHub sync

`npm run sync` writes `data/github.json`, `data/readmes/` and `data/excerpts/`.
`.github/workflows/sync-github.yml` runs it every Monday and commits only if something really
changed. Because a push made with the built-in token does not trigger CI, the job type-checks,
tests and builds before it commits.

- Works without a token (60 API requests per hour; a run uses about 25). Set `GITHUB_TOKEN` for more.
- Writes nothing at all when nothing changed, so the weekly job only commits real changes.
- **Refuses to write any file that looks like it contains a credential** and says which file and
  which kind, never the value (`scanForSecrets` in `lib/github/transform.ts`).
- If Vercel does not deploy commits made by the Actions bot, create a Vercel Deploy Hook and store
  its URL as the repository secret `VERCEL_DEPLOY_HOOK`; the workflow then triggers the deploy.

## Recording a run

```bash
npm run record -- haystack-strategies --cwd ~/Haystack --as "~/Haystack" \
  --note "Haystack at c745fe6" -- python3 -m attack strategies
```

The command runs in a pseudo-terminal so tools print colours. The recorder replaces local paths,
refuses output that looks like a secret, and writes `public/casts/<name>.cast` (asciicast v2; v3 is
also read). Register it under the project's `recordings` in `content/config.ts`. Record from a clean
checkout of the commit you cite, so the recording matches the code on the page.

## Deploying

Keep Vercel's **Next.js** framework preset and Node 24. A static export writes `README.md.html`
for `README.md`, and the preset serves it at the extensionless URL; pointing the output directory
at `out/` by hand would break those URLs. Redirects for the old site's URLs and the security
headers (including a Content-Security-Policy limited to the chain endpoints the site uses) are in
`vercel.json`; a test keeps the CSP in step with `lib/chain/networks.ts`.

The canonical URL is set once in `lib/site.ts`.

## Layout

```
app/            routes: welcome, [...path] (every file), /resume, /vfs/*.json, SHA256SUMS, sitemap
components/     workbench (title bar, explorer, tabs, status bar, panel), editor, terminal
content/        config.ts and the hand-written project pages
data/           generated by the sync: GitHub snapshot, READMEs, pinned excerpts
lib/vfs/        the builder and path logic        lib/terminal/  commands, completion, history
lib/chain/      ABI, RPC, checksums               lib/ansi, lib/cast/  recording replay
public/casts/   recorded terminal sessions        scripts/       sync, record, preview
.github/        CI, weekly sync, Dependabot
```

## Notes

- **No secrets, ever.** Nothing here needs a key. The chain features call public endpoints from the
  visitor's browser, and each was checked to allow cross-origin requests.
- **Pinned on purpose:** TypeScript 6 (typescript-eslint does not support 7 yet) and ESLint 9
  (plugins in `eslint-config-next` do not support 10 yet). Dependabot ignores those major versions.
- **Testnets only.** Every contract listed is on a test network and the site says so.
