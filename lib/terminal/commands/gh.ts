import { SITE_REPO } from "../../site";
import { splitFlags } from "../parse";
import { closest } from "../suggest";
import { blank, bold, cmd, color, columns, error, link, plain } from "../text";
import type { Command, Line, Result, Span } from "../types";
import { findProject, plural, projectAt, shortDate } from "./shared";

const ok = (lines: Line[], extra: Partial<Result> = {}): Result => ({ lines, ...extra });

const USAGE = [
  "usage: gh pr list [--merged] [--repo owner/name]",
  "       gh repo view [name]",
  "       gh repo list",
];

export const ghCommand: Command = {
  name: "gh",
  group: "work",
  summary: "my pull requests and repositories (GitHub CLI style)",
  usage: "gh pr list --merged | gh repo view [name] | gh repo list",
  complete: (args, _s, env) => {
    const last = args[args.length - 1] ?? "";
    if (args.length <= 1) return ["pr", "repo"].filter((s) => s.startsWith(last));
    if (args[0] === "pr" && args.length === 2) return ["list"].filter((s) => s.startsWith(last));
    if (args[0] === "repo" && args.length === 2) return ["view", "list"].filter((s) => s.startsWith(last));
    if (args[0] === "repo" && args[1] === "view") return env.data.repos.map((r) => r.name).filter((n) => n.toLowerCase().startsWith(last.toLowerCase()));
    if (args[0] === "pr") return ["--merged", "--repo"].filter((s) => s.startsWith(last));
    return [];
  },
  run(args, session, env) {
    const { data } = env;
    const [group, action, ...rest] = args;

    if (group === "pr" && action === "list") {
      const { flags } = splitFlags(rest);
      const repoIndex = rest.indexOf("--repo");
      const repoFilter = repoIndex === -1 ? null : (rest[repoIndex + 1] ?? "").toLowerCase();
      const prs = data.pullRequests.filter((p) => !repoFilter || p.repo.toLowerCase() === repoFilter || p.repo.toLowerCase().endsWith(`/${repoFilter}`));
      if (prs.length === 0) return ok([plain("no merged pull requests match")], { status: 1 });
      const repos = new Set(prs.map((p) => p.repo)).size;
      const rows = prs.map((p): Span[] => [
        { text: `#${p.number}`, fg: "brightGreen", href: p.url, underline: true },
        { text: p.repo, fg: "brightBlue" },
        { text: p.title },
        { text: `merged ${shortDate(p.mergedAt)}`, dim: true },
      ]);
      return ok([
        [bold(`Showing ${plural(prs.length, "merged pull request")} across ${plural(repos, "repository", "repositories")}`)],
        ...(flags.has("--merged") ? [] : [[color("(only merged pull requests are listed here)", "brightBlack")] as Line]),
        blank(),
        ...columns(rows),
      ]);
    }

    if (group === "repo" && action === "list") {
      const sorted = data.repos.filter((r) => r.listed).sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
      const rows = sorted.map((r): Span[] => [
        cmd(r.name, `gh repo view ${r.name}`, "brightBlue"),
        { text: r.description ?? "", dim: !r.description },
        { text: r.language ?? "-" },
        { text: shortDate(r.pushedAt), dim: true },
      ]);
      return ok([[bold(`Showing ${plural(sorted.length, "repository", "repositories")}`)], blank(), ...columns(rows)]);
    }

    if (group === "repo" && action === "view") {
      const typed = rest[0];
      const project = typed ? findProject(data, typed) : projectAt(data, session.cwd);
      const wanted = (typed ?? project?.repo ?? SITE_REPO).toLowerCase();
      const repo = data.repos.find((r) => r.fullName.toLowerCase() === wanted || r.name.toLowerCase() === wanted.split("/").pop());
      if (repo) {
        return ok([
          [color(repo.fullName, "brightBlue", { bold: true })],
          [{ text: repo.description ?? "(no description)", dim: !repo.description }],
          blank(),
          [bold("Language: "), { text: repo.language ?? "-" }],
          [bold("Stars: "), { text: String(repo.stars) }],
          [bold("Created: "), { text: shortDate(repo.createdAt) }],
          [bold("Last push: "), { text: shortDate(repo.pushedAt) }],
          ...(repo.homepage ? [[bold("Homepage: "), link(repo.homepage)] as Line] : []),
          [bold("URL: "), link(repo.htmlUrl)],
        ]);
      }
      if (project) {
        // Open-source work lives in someone else's repository, so there is no snapshot entry for it.
        return ok([
          [color(project.repo, "brightBlue", { bold: true })],
          plain(project.tagline),
          blank(),
          plain("This is another team's repository; the work there is my merged pull requests."),
          [bold("URL: "), link(`https://github.com/${project.repo}`)],
          [{ text: "See " }, cmd(`gh pr list --merged --repo ${project.repo}`)],
        ]);
      }
      return { lines: [error(`GraphQL: Could not resolve to a Repository with the name '${typed}'. (repository)`)], status: 1 };
    }

    if (!group) return ok(USAGE.map(plain), { status: 1 });
    const guess = closest(group, ["pr", "repo"]);
    return { lines: [error(`unknown command "${group}" for "gh"`), ...(guess ? [plain(`Did you mean "${guess}"?`)] : []), ...USAGE.map(plain)], status: 1 };
  },
};
