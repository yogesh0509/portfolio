import type { EducationEntry, ExperienceEntry, FeaturedProject } from "../../content/config";
import type { TerminalContract } from "../chain/types";
import type { PullRequest, Snapshot } from "../github/schema";

/**
 * Everything the terminal's commands read, as plain data. Built once at build time
 * (see app/vfs/terminal.json) and fetched the first time the terminal opens.
 */

export interface TerminalProject {
  slug: string;
  folder: "projects" | "open-source";
  /** VFS directory, e.g. /projects/haystack. */
  path: string;
  title: string;
  tagline: string;
  repo: string;
  extraRepos: string[];
  period: string;
  role?: string;
  stack: { languages: string[]; frameworks: string[] };
  live?: string;
  /** HTTP status of the live demo at the last sync. Undefined if never checked. */
  liveStatus?: number | null;
  liveCheckedAt?: string;
  local?: { port: number; command: string };
  /** Repository description from GitHub, if any. */
  description: string | null;
}

export interface RepoSummary {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  createdAt: string;
  pushedAt: string;
  htmlUrl: string;
  homepage: string | null;
  /** False for repos on the exclusion list and archived repos: listings and counts skip them. */
  listed: boolean;
}

/**
 * A language I use. Byte counts are deliberately not kept: GitHub's per-language bytes include
 * committed third-party libraries (one repo of mine has 1.7 MB of vendored Solidity), so a share
 * of bytes would say more about what I copied in than about what I write. Counting repositories
 * cannot be inflated that way.
 */
export interface LanguageStat {
  /** As GitHub names it, e.g. "Rust". */
  name: string;
  /** Lower-case package-style name, e.g. "rust". */
  id: string;
  /** Repositories where the language is at least MIN_REPO_SHARE of the code. */
  repos: string[];
  /** Most recent push to one of those repositories. */
  lastPush: string;
}

/** A language counts as "used" in a repository when it is at least this share of that repository's bytes. */
export const MIN_REPO_SHARE = 0.1;

export interface TimelineEntry {
  /** As precise as the source is: YYYY-MM-DD, YYYY-MM or YYYY. */
  date: string;
  /** Sorts newest first; unknown month/day sort before the known ones of the same period. */
  sortKey: string;
  kind: "pr" | "role" | "project" | "education";
  text: string;
  /** "#57" for a merged pull request. */
  ref?: string;
  repo?: string;
  url?: string;
}

export interface TerminalSystem {
  os: string;
  distro: string;
  kernel: string;
  kernelVersion: string;
  aptVersion: string;
  arch: string;
  user: string;
  host: string;
  osRelease: readonly string[];
}

export interface TerminalData {
  system: TerminalSystem;
  profile: { name: string; handle: string; headline: string; summary: string; location: string; email: string; github: string; linkedin: string; resumeUrl: string };
  build: { branch: string; commit: string; repoUrl: string };
  syncedAt: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: { group: string; items: string[] }[];
  projects: TerminalProject[];
  repos: RepoSummary[];
  pullRequests: PullRequest[];
  languages: LanguageStat[];
  contracts: TerminalContract[];
  timeline: TimelineEntry[];
  /** Most recent push to any repo shown on the site. */
  lastPush: string | null;
}

export interface TerminalDataInput {
  system: TerminalSystem;
  profile: TerminalData["profile"];
  build: TerminalData["build"];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: TerminalData["skills"];
  projects: FeaturedProject[];
  excludedRepos: string[];
  contracts: TerminalContract[];
  snapshot: Snapshot;
}

/** "YYYY", "YYYY-MM" or "YYYY-MM-DD" to a key where less precise dates sort first. */
export function sortKeyOf(date: string): string {
  const [y, m = "00", d = "00"] = date.split("-");
  return `${y}-${m}-${d}`;
}

export function buildTerminalData(input: TerminalDataInput): TerminalData {
  const { snapshot } = input;
  const excluded = new Set(input.excludedRepos.map((r) => r.toLowerCase()));
  const own = snapshot.repos.filter((r) => !r.fork);

  const projects: TerminalProject[] = input.projects.map((p) => {
    const repo = snapshot.repos.find((r) => r.fullName.toLowerCase() === p.repo.toLowerCase());
    const demo = p.live ? snapshot.demos.find((d) => d.url === p.live) : undefined;
    return {
      slug: p.slug,
      folder: p.folder,
      path: `/${p.folder}/${p.slug}`,
      title: p.title,
      tagline: p.tagline,
      repo: p.repo,
      extraRepos: p.extraRepos ?? [],
      period: p.period,
      role: p.role,
      stack: p.stack,
      live: p.live,
      liveStatus: demo?.status,
      liveCheckedAt: demo?.checkedAt,
      local: p.local,
      description: repo?.description ?? null,
    };
  });

  // Languages across every public repo I own (forks are other people's code), counted by repository.
  const byLang = new Map<string, { repos: string[]; lastPush: string }>();
  for (const repo of own) {
    const total = Object.values(repo.languages).reduce((sum, bytes) => sum + bytes, 0);
    for (const [name, bytes] of Object.entries(repo.languages)) {
      if (total === 0 || bytes / total < MIN_REPO_SHARE) continue;
      const entry = byLang.get(name) ?? { repos: [], lastPush: "" };
      entry.repos.push(repo.name);
      if (repo.pushedAt > entry.lastPush) entry.lastPush = repo.pushedAt;
      byLang.set(name, entry);
    }
  }
  const languages: LanguageStat[] = [...byLang]
    .map(([name, e]) => ({ name, id: name.toLowerCase().replace(/\s+/g, "-"), repos: e.repos.sort(), lastPush: e.lastPush }))
    // Most repositories first, then the most recently used, then by name so the order is stable.
    .sort((a, b) => b.repos.length - a.repos.length || b.lastPush.localeCompare(a.lastPush) || a.name.localeCompare(b.name));

  const timeline: TimelineEntry[] = [];
  for (const entry of input.experience) {
    for (const role of entry.roles) {
      timeline.push({ date: role.from, sortKey: sortKeyOf(role.from), kind: "role", text: `${role.title} at ${entry.org}` });
    }
  }
  for (const e of input.education) {
    timeline.push({ date: String(e.from), sortKey: sortKeyOf(String(e.from)), kind: "education", text: `started at ${e.school}` });
    timeline.push({ date: String(e.to), sortKey: sortKeyOf(String(e.to)), kind: "education", text: `completed ${e.degree} at ${e.school}` });
  }
  for (const project of projects.filter((p) => p.folder === "projects")) {
    const repo = snapshot.repos.find((r) => r.fullName.toLowerCase() === project.repo.toLowerCase());
    if (repo) timeline.push({ date: repo.createdAt.slice(0, 10), sortKey: sortKeyOf(repo.createdAt.slice(0, 10)), kind: "project", text: `started ${project.title}`, repo: repo.fullName, url: repo.htmlUrl });
  }
  for (const pr of snapshot.pullRequests) {
    timeline.push({ date: pr.mergedAt.slice(0, 10), sortKey: sortKeyOf(pr.mergedAt.slice(0, 10)), kind: "pr", text: pr.title, ref: `#${pr.number}`, repo: pr.repo, url: pr.url });
  }
  timeline.sort((a, b) => b.sortKey.localeCompare(a.sortKey) || a.text.localeCompare(b.text));

  const shown = own.filter((r) => !r.archived && !excluded.has(r.name.toLowerCase()));
  const lastPush = shown.reduce<string | null>((latest, r) => (latest === null || r.pushedAt > latest ? r.pushedAt : latest), null);

  return {
    system: input.system,
    profile: input.profile,
    build: input.build,
    syncedAt: snapshot.syncedAt,
    experience: input.experience,
    education: input.education,
    skills: input.skills,
    projects,
    repos: own.map((r) => ({
      name: r.name,
      fullName: r.fullName,
      description: r.description,
      language: r.language,
      stars: r.stars,
      createdAt: r.createdAt,
      pushedAt: r.pushedAt,
      htmlUrl: r.htmlUrl,
      homepage: r.homepage,
      listed: !r.archived && !excluded.has(r.name.toLowerCase()),
    })),
    pullRequests: [...snapshot.pullRequests].sort((a, b) => b.mergedAt.localeCompare(a.mergedAt) || a.number - b.number),
    languages,
    contracts: input.contracts,
    timeline,
    lastPush,
  };
}
