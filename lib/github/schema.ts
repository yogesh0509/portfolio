import { z } from "zod";
import { isHttpUrl } from "../safe-url";

/** Every URL in the snapshot is shown as a link, so it must be a real http(s) URL: a poisoned file cannot smuggle in `javascript:`. */
const httpUrl = z.string().refine(isHttpUrl, "must be an http(s) URL");

/**
 * Shape of data/github.json, the weekly snapshot written by scripts/sync-github.ts.
 * The site reads it at build time, so a bad snapshot must fail loudly here.
 */

export const RepoSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  /** GitHub's primary language for the repo. */
  language: z.string().nullable(),
  /** Bytes of code per language. */
  languages: z.record(z.string(), z.number()),
  stars: z.number(),
  forks: z.number(),
  topics: z.array(z.string()),
  homepage: httpUrl.nullable(),
  createdAt: z.string(),
  pushedAt: z.string(),
  fork: z.boolean(),
  archived: z.boolean(),
  htmlUrl: httpUrl,
  defaultBranch: z.string(),
  /** True when data/readmes/<name>.md exists. */
  hasReadme: z.boolean(),
});

export const PullRequestSchema = z.object({
  /** owner/name of the repository the PR was merged into. */
  repo: z.string(),
  number: z.number(),
  title: z.string(),
  url: httpUrl,
  mergedAt: z.string(),
});

export const DemoSchema = z.object({
  repo: z.string(),
  url: httpUrl,
  /** HTTP status of the last check, or null when the request failed. */
  status: z.number().nullable(),
  /** Excluded from the "did anything change" comparison, so it never forces a commit. */
  checkedAt: z.string(),
});

export const ProfileSchema = z.object({
  login: z.string(),
  name: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  /**
   * The text between <!-- portfolio:summary --> and <!-- /portfolio:summary --> in my profile
   * README (github.com/yogesh0509/yogesh0509), as plain text. Null before the first sync that read it.
   */
  summary: z.string().nullable().default(null),
  followers: z.number(),
  publicRepos: z.number(),
  createdAt: z.string(),
});

export const SnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  /** Moves only when the snapshot's content changed. Null before the first sync. */
  syncedAt: z.string().nullable(),
  profile: ProfileSchema.nullable(),
  repos: z.array(RepoSchema),
  pullRequests: z.array(PullRequestSchema),
  demos: z.array(DemoSchema),
});

export type Repo = z.infer<typeof RepoSchema>;
export type PullRequest = z.infer<typeof PullRequestSchema>;
export type Demo = z.infer<typeof DemoSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const EMPTY_SNAPSHOT: Snapshot = {
  schemaVersion: 1,
  syncedAt: null,
  profile: null,
  repos: [],
  pullRequests: [],
  demos: [],
};
