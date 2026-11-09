import type { EducationEntry, ExcerptSpec, ExperienceEntry, FeaturedProject, Role } from "../../content/config";
import { canonical, parseSignature } from "../chain/abi";
import { addressUrl, NETWORKS } from "../chain/networks";
import type { PullRequest, Snapshot } from "../github/schema";
import { langFromFilename, type LangId } from "../languages";
import { excerptHeader, excerptName, permalink } from "./excerpt";
import { isReservedTopLevel } from "./paths";
import { countLines } from "./tree";
import type { FileLinks, MarkdownSource, VfsDir, VfsFile, VfsNode } from "./types";

/** Everything the builder needs. Pure data in, tree out: no disk access in this file. */
export interface SiteConfig {
  profile: {
    name: string;
    handle: string;
    location: string;
    headline: string;
    summary: string;
    email: string;
    github: string;
    linkedin: string;
    resumeUrl: string;
  };
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: { group: string; items: string[] }[];
  projects: FeaturedProject[];
  excludedRepos: string[];
}

export interface BuildInput {
  config: SiteConfig;
  snapshot: Snapshot;
  /** Reads a text file relative to the project root. Returns null when it does not exist. */
  read: (relPath: string) => string | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-10" becomes "October 2026". Fixed English names keep the build deterministic. */
export function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  return `${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

function formatRole(role: Role): string {
  return `${formatMonth(role.from)} to ${role.to ? formatMonth(role.to) : "present"}`;
}

function file(
  dir: string,
  name: string,
  content: string,
  extra: { lang?: LangId; links?: FileLinks; source?: MarkdownSource } = {},
): VfsFile {
  const path = dir === "/" ? `/${name}` : `${dir}/${name}`;
  return {
    kind: "file",
    name,
    path,
    url: path === "/README.md" ? "/" : path,
    lang: extra.lang ?? langFromFilename(name),
    content,
    lines: countLines(content),
    size: new TextEncoder().encode(content).length,
    links: extra.links ?? {},
    source: extra.source,
  };
}

function dir(parent: string, name: string, children: VfsNode[]): VfsDir {
  return { kind: "dir", name, path: parent === "/" ? `/${name}` : `${parent}/${name}`, children };
}

const day = (iso: string) => iso.slice(0, 10);

function pullRequestsFor(project: FeaturedProject, snapshot: Snapshot): PullRequest[] {
  const repos = [project.repo, ...(project.extraRepos ?? [])].map((r) => r.toLowerCase());
  return snapshot.pullRequests
    .filter((pr) => repos.includes(pr.repo.toLowerCase()))
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));
}

const shortAddress = (address: string) => (address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address);

/** A table of the testnet contracts, with explorer links. The addresses come only from the config. */
function contractsSection(project: FeaturedProject): string[] {
  const contracts = project.contracts ?? [];
  if (contracts.length === 0) return [];
  const rows = contracts.map((c) => {
    const network = NETWORKS[c.network];
    const calls = (c.calls ?? []).map((call) => `\`${canonical(parseSignature(call.signature))}\``).join(", ") || "none listed";
    return `| ${network.name} | ${c.name} | [\`${shortAddress(c.address)}\`](${addressUrl(network, c.address)}) | ${calls} |`;
  });
  const notes = contracts.filter((c) => c.note).map((c) => `- **${c.name}** (${NETWORKS[c.network].name}): ${c.note}`);
  const callable = contracts.some((c) => (c.calls?.length ?? 0) > 0);
  return [
    "",
    "## Deployed contracts",
    "",
    "Testnets only. Each address opens on its block explorer.",
    "",
    "| Network | Contract | Address | Read-only calls |",
    "|---|---|---|---|",
    ...rows,
    ...(notes.length > 0 ? ["", ...notes] : []),
    ...(callable ? ["", "In the terminal, `cast call --list` lists every function that can be called live against these contracts."] : []),
  ];
}

function projectReadme(project: FeaturedProject, snapshot: Snapshot, body: string | null): string {
  const lines = [
    `# ${project.title}`,
    "",
    project.tagline,
    "",
    `- **Period:** ${project.period}`,
  ];
  if (project.role) lines.push(`- **Role:** ${project.role}`);
  lines.push(`- **Languages:** ${project.stack.languages.join(", ")}`);
  lines.push(`- **Built with:** ${project.stack.frameworks.join(", ")}`);
  lines.push(`- **Repository:** [${project.repo}](https://github.com/${project.repo})`);
  if (project.live) lines.push(`- **Live demo:** [${project.live}](${project.live})`);
  if (project.local) lines.push(`- **Runs locally on:** \`127.0.0.1:${project.local.port}\``);
  if (body && body.trim()) lines.push("", body.trim());
  lines.push(...contractsSection(project));

  const prs = pullRequestsFor(project, snapshot);
  if (prs.length > 0) {
    lines.push("", "## Merged pull requests", "");
    for (const pr of prs) {
      lines.push(`- [${pr.repo}#${pr.number}](${pr.url}): ${pr.title} (merged ${day(pr.mergedAt)})`);
    }
  }
  return lines.join("\n") + "\n";
}

function experienceMarkdown(entry: ExperienceEntry): string {
  const lines = [`# ${entry.org}`, "", entry.place, ""];
  for (const role of entry.roles) {
    lines.push(`## ${role.title}`, "", formatRole(role), "");
  }
  if (entry.bullets.length > 0) {
    lines.push("## What I did", "");
    for (const bullet of entry.bullets) lines.push(`- ${bullet}`);
    lines.push("");
  }
  return lines.join("\n");
}

function welcomeMarkdown(config: SiteConfig, snapshot: Snapshot): string {
  const { profile } = config;
  const current = config.experience[0];
  const currentRole = current?.roles.find((r) => r.to === null);
  const lines = [`# ${profile.name}`, "", profile.summary, ""];
  if (current && currentRole) lines.push(`${currentRole.title} at ${current.org}, ${current.place}.`, "");

  lines.push("## Start", "");
  lines.push("- [Résumé](/resume)");
  if (profile.resumeUrl) lines.push(`- [Download résumé (PDF)](${profile.resumeUrl})`);
  lines.push(`- [Email](mailto:${profile.email})`);
  lines.push(`- [GitHub](${profile.github})`);
  lines.push(`- [LinkedIn](${profile.linkedin})`, "");

  lines.push("## Featured", "");
  for (const project of config.projects) {
    lines.push(`- [${project.title}](/${project.folder}/${project.slug}/README.md): ${project.tagline}`);
  }
  lines.push("");

  const excluded = new Set(config.excludedRepos.map((r) => r.toLowerCase()));
  const recent = [...snapshot.repos]
    .filter((repo) => !repo.fork && !repo.archived && !excluded.has(repo.name.toLowerCase()))
    .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))
    .slice(0, 3);
  const merged = [...snapshot.pullRequests].sort((a, b) => b.mergedAt.localeCompare(a.mergedAt)).slice(0, 3);
  if (recent.length > 0 || merged.length > 0) {
    lines.push("## Recent activity", "");
    for (const repo of recent) lines.push(`- ${day(repo.pushedAt)}: pushed to [${repo.name}](${repo.htmlUrl})`);
    for (const pr of merged) lines.push(`- ${day(pr.mergedAt)}: merged [${pr.repo}#${pr.number}](${pr.url}), ${pr.title}`);
    lines.push("");
  }

  lines.push("---", "", "Everything here is clickable. Press Ctrl+P to open any file, or type `help` in the terminal below.", "");
  lines.push(
    "This site is a static build. The project pages and the terminal are generated from my GitHub data, which a weekly job refreshes. " +
      "The source is [yogesh0509/portfolio-yogesh0509](https://github.com/yogesh0509/portfolio-yogesh0509).",
    "",
  );
  return lines.join("\n");
}

/** A JSON Resume (jsonresume.org) document built from the same config as the site. */
function resumeJson(config: SiteConfig): string {
  const { profile } = config;
  const doc = {
    $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics: {
      name: profile.name,
      label: profile.headline,
      email: profile.email,
      summary: profile.summary,
      location: { city: "Bengaluru", region: "Karnataka", countryCode: "IN" },
      profiles: [
        { network: "GitHub", username: profile.handle, url: profile.github },
        { network: "LinkedIn", username: profile.handle, url: profile.linkedin },
      ],
    },
    work: config.experience.flatMap((entry) =>
      entry.roles.map((role, index) => ({
        name: entry.org,
        position: role.title,
        location: entry.place,
        startDate: role.from,
        ...(role.to ? { endDate: role.to } : {}),
        // Bullets describe the organisation's work as a whole, so only the first role carries them.
        highlights: index === 0 ? entry.bullets : [],
      })),
    ),
    education: config.education.map((e) => ({
      institution: e.school,
      area: e.degree,
      startDate: String(e.from),
      endDate: String(e.to),
    })),
    skills: config.skills.map((s) => ({ name: s.group, keywords: s.items })),
  };
  return JSON.stringify(doc, null, 2) + "\n";
}

function projectExcerpts(project: FeaturedProject, read: BuildInput["read"]): VfsFile[] {
  const files: VfsFile[] = [];
  const parent = `/${project.folder}/${project.slug}`;
  for (const spec of project.excerpts as ExcerptSpec[]) {
    const name = excerptName(spec);
    const body = read(`data/excerpts/${project.slug}/${name}`);
    if (body === null) continue; // not fetched yet: the next sync adds it
    const lang = langFromFilename(name);
    files.push(
      file(parent, name, excerptHeader(spec, lang) + body, {
        lang,
        links: { github: `https://github.com/${spec.repo}`, permalink: permalink(spec) },
      }),
    );
  }
  return files;
}

export function buildVfs({ config, snapshot, read }: BuildInput): VfsDir {
  const featuredRepos = new Set(
    config.projects.flatMap((p) => [p.repo, ...(p.extraRepos ?? [])]).map((r) => r.toLowerCase()),
  );
  const excluded = new Set(config.excludedRepos.map((r) => r.toLowerCase()));

  const projectDir = (project: FeaturedProject): VfsDir => {
    const parent = `/${project.folder}`;
    const readme = file(
      `${parent}/${project.slug}`,
      "README.md",
      projectReadme(project, snapshot, read(`content/projects/${project.slug}.md`)),
      { links: { github: `https://github.com/${project.repo}`, live: project.live } },
    );
    return dir(parent, project.slug, [readme, ...projectExcerpts(project, read)]);
  };

  const ofFolder = (folder: FeaturedProject["folder"]) =>
    config.projects.filter((p) => p.folder === folder).map(projectDir);

  const experienceFiles = config.experience.map((entry) =>
    file("/experience", `${entry.id}.md`, experienceMarkdown(entry)),
  );

  const archiveDirs = snapshot.repos
    .filter(
      (repo) =>
        !repo.fork &&
        !repo.archived &&
        repo.hasReadme &&
        !featuredRepos.has(repo.fullName.toLowerCase()) &&
        !excluded.has(repo.name.toLowerCase()),
    )
    .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))
    .flatMap((repo) => {
      const readme = read(`data/readmes/${repo.name}.md`);
      if (readme === null) return [];
      const slug = repo.name.toLowerCase();
      return [
        dir("/archive", slug, [
          file(`/archive/${slug}`, "README.md", readme, {
            links: { github: repo.htmlUrl, live: repo.homepage || undefined },
            source: { repo: repo.fullName, ref: repo.defaultBranch },
          }),
        ]),
      ];
    });

  const children: VfsNode[] = [
    file("/", "README.md", welcomeMarkdown(config, snapshot)),
    file("/", "resume.json", resumeJson(config), { links: { github: config.profile.github } }),
    dir("/", "open-source", ofFolder("open-source")),
    dir("/", "projects", ofFolder("projects")),
    dir("/", "experience", experienceFiles),
  ];
  if (archiveDirs.length > 0) children.push(dir("/", "archive", archiveDirs));

  const tree: VfsDir = { kind: "dir", name: "", path: "/", children };
  assertValidTree(tree);
  return tree;
}

/**
 * Refuses a tree that would break routing: a top-level name that is also a real route
 * (resume, vfs, robots.txt, ...), or two entries whose names differ only by case.
 */
export function assertValidTree(root: VfsDir): void {
  for (const child of root.children) {
    if (isReservedTopLevel(child.name)) {
      throw new Error(`"${child.name}" collides with a reserved route name`);
    }
  }
  assertUnique(root.children);
}

function assertUnique(nodes: VfsNode[]): void {
  const seen = new Set<string>();
  for (const node of nodes) {
    const key = node.name.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate name "${node.name}" in ${node.path}`);
    seen.add(key);
    if (node.kind === "dir") assertUnique(node.children);
  }
}
