# portfolio-yogesh0509

My portfolio, built to look like VS Code connected to a WSL Ubuntu machine, because it shows code
first and decoration second. Projects are files in the language they are written in, the terminal
is a simulation that reads my real data, and the GitHub numbers (repositories, pull requests, languages,
last push) come from a weekly snapshot of my GitHub account. The résumé comes from a PDF, and the Ubuntu
version and kernel that `neofetch` prints are typed into `content/config.ts`.

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
                                                            └─> /vfs/*.json (terminal data)
```

- **One source of truth.** `content/config.ts` lists my links, the featured projects, the testnet
  contracts and which code to excerpt. `data/` holds what GitHub says, refreshed weekly, including
  my name, headline (GitHub bio), location and summary (see below), and what my résumé PDF says.
  Nothing else lists a project, so there is one place to edit.
- **A virtual file system (VFS).** `lib/vfs/build.ts` turns the two inputs into a tree of files.
  Pages, the explorer, Quick Open and the terminal all read that tree, so they cannot disagree.
- **Real code, pinned.** Each project shows excerpts of code I wrote, fetched at a pinned commit
  and headed with a permalink to the exact lines.
- **A terminal that does things.** Commands are plain functions over data (`lib/terminal/`): they
  return lines and effects and never touch the page. `run <project>` opens a live demo or shows how
  to start one locally; `cast call` reads my testnet contracts live.
- **Highlighting at build time.** Shiki uses VS Code's own grammars, so colours match the editor,
  and none of it ships to the browser.

## Add or change a project

1. Add an entry to `projects` in `content/config.ts` (slug, folder, title, one-sentence tagline,
   repo, stack, period). Optional: `live`, `local`, `contracts`, `excerpts`. An entry in the
   `hackathons` folder also lists its events in `hackathons`, with the result when it placed.
2. Write the page body in `content/projects/<slug>.md`. The facts table, the deployed-contracts
   table and the merged pull requests are generated.
3. For an excerpt, give the repo, path, **full commit SHA** and line range. Use a commit that is on
   the public remote. `pinnedOnPurpose` silences the stale warning when other people rewrote the
   file afterwards and the pinned version is the one to show.
4. Run `npm run sync`. It fetches every excerpt and fails if a SHA or line range does not exist.

EVM contract addresses must be EIP-55 checksummed or the build fails: a typo is caught, not shown.

A research paper is an entry in `research` in `content/config.ts` with its body in
`content/research/<slug>.md`; it appears under `/research`. A video is an entry in `videos`: a folder,
an https YouTube or Loom link, a title and its length. It becomes a `.mp4` file in that folder that
plays in the editor, is shown under the folder's README, and opens from the terminal with
`watch <folder>`. The player loads from YouTube or Loom only after a click. The build fails if the
folder does not exist, the link is not YouTube or Loom, or the provider is missing from `frame-src` in
`vercel.json`.

## The GitHub sync

`npm run sync` writes `data/github.json`, `data/readmes/` and `data/excerpts/`.

`.github/workflows/sync-github.yml` runs it every Monday and proposes the result in **one pull
request** from the branch `sync/github-data`; nothing reaches `main` until I merge it. While the PR
is open, each run rebuilds the branch as current `main` plus one data commit, so the PR stays
mergeable and its Vercel Preview shows exactly what would deploy, and comments with what was new
that week. A week with no new data posts no comment (the branch is still rebuilt if `main` moved).
The job type-checks and builds before it pushes.
It needs Settings > Actions > General > "Allow GitHub Actions to create and approve pull requests".

- **The site's prose comes from GitHub.** My name, headline (the bio), location and summary are
  read from my GitHub profile. The summary is the text marked in my profile README:
  `<!-- portfolio:summary -->…<!-- /portfolio:summary -->` (GitHub hides the comments). The build
  stops if one is missing, rather than show an old text.
- **Problems with my own inputs do not block the rest.** An empty bio or a broken marker keeps the
  previous value, the rest is still synced, and the run then fails so GitHub emails me.
- Works without a token (60 API requests per hour; a run uses about 25). Set `GITHUB_TOKEN` for more.
- Writes nothing at all when nothing changed. The last push to this repo is ignored when comparing,
  because the job's own push moves it.
- **Refuses to write any file that looks like it contains a credential** and says which file and
  which kind, never the value (`scanForSecrets` in `lib/github/transform.ts`).

## The résumé

My résumé is a private Google Doc. Its exported PDF is in Google Drive, shared as "Anyone with the
link: Viewer", and its share link is `resumePdf.url` in `content/config.ts`. The sync downloads the
PDF, reads its text with pdf.js the way a résumé parser would (`lib/resume/pdf.ts`), reads the
sections with `lib/resume/parse.ts` and writes `data/resume.json`. The site links the same PDF as
"Download the PDF".

The Doc follows the layout of my `gdoc-resume` skill (`references/conventions.md`), which keeps the
PDF easy for applicant tracking systems to parse:

- each section title is a line in capitals;
- fields on a line are separated by `|`;
- each role line ends with its dates, e.g. `Member of Technical Staff | Oct 2026 – Present`;
- details are bullets.

To update the résumé: edit the Doc, export it as PDF, and in Drive use Manage versions → Upload new
version on the shared PDF. The link stays the same, and the next sync PR picks up the change. To
check a PDF before uploading it, run `npm run sync -- --dry-run --resume-pdf FILE.pdf`.

**Fallback:** the site uses the PDF only when its experience, education and skills all parse. While
the PDF is not set, cannot be downloaded or is incomplete, the whole résumé (the `/resume` page,
`resume.json`, `/experience` and the terminal) uses the `experience`, `education` and `skills`
lists in `content/config.ts`. A complete PDF is never mixed with the fallback lists, with one exception:
an `experience` entry marked `keepWithPdf` stays in the experience list when the PDF does not list it
(today the Google Summer of Code internship, which the PDF files under "Open source"). The sync's
summary, and the PR comment, say which source was used and why.

Organisations already listed in `content/config.ts` keep their `/experience/<id>.md` address when
they come from the PDF.

## Deploying

Keep Vercel's **Next.js** framework preset and Node 24. A static export writes `README.md.html`
for `README.md`, and the preset serves it at the extensionless URL; pointing the output directory
at `out/` by hand would break those URLs. Redirects for the old site's URLs and the security
headers (including a Content-Security-Policy limited to the chain endpoints the site uses) are in
`vercel.json`. `next.config.ts` refuses to build when an endpoint in `lib/chain/networks.ts` is
missing from the CSP's `connect-src`, because the browser would block it in production only.

The canonical URL is set once in `lib/site.ts`.

## Layout

```
app/            routes: welcome, [...path] (every file), /resume, /vfs/*.json, robots.txt
components/     workbench (title bar, explorer, tabs, status bar, panel), editor, terminal
content/        config.ts and the hand-written project pages
data/           generated by the sync: GitHub snapshot, READMEs, pinned excerpts, résumé
lib/vfs/        the builder and path logic        lib/terminal/  commands, completion, history
lib/chain/      ABI, RPC, address checksums       scripts/       sync, preview
.github/        CI, weekly sync
```

## Notes

- **No secrets, ever.** Nothing here needs a key. The chain features call public endpoints from the
  visitor's browser, and each was checked to allow cross-origin requests.
- **Pinned on purpose:** TypeScript 6 (typescript-eslint does not support 7 yet) and ESLint 9
  (plugins in `eslint-config-next` do not support 10 yet). Do not bump either past that major version.
- **Testnets only.** Every contract listed is on a test network and the site says so.
