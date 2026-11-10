import { z } from "zod";
import { isHttpUrl } from "../safe-url";
import type { Demo, PullRequest, Repo, Snapshot } from "./schema";

/**
 * Pure functions that turn GitHub API responses into the committed snapshot.
 * No network and no disk here, so every rule can be checked in isolation.
 */

export const ApiUserSchema = z.object({
  login: z.string(),
  name: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  followers: z.number(),
  public_repos: z.number(),
  created_at: z.string(),
});

export const ApiRepoSchema = z.object({
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  topics: z.array(z.string()).optional(),
  homepage: z.string().nullable(),
  created_at: z.string(),
  pushed_at: z.string(),
  fork: z.boolean(),
  archived: z.boolean(),
  html_url: z.string(),
  default_branch: z.string(),
});

export const ApiSearchItemSchema = z.object({
  number: z.number(),
  title: z.string(),
  html_url: z.string(),
  repository_url: z.string(),
  pull_request: z.object({ merged_at: z.string().nullable() }).optional(),
});

export const ApiSearchSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean().optional(),
  items: z.array(ApiSearchItemSchema),
});

export type ApiUser = z.infer<typeof ApiUserSchema>;
export type ApiRepo = z.infer<typeof ApiRepoSchema>;
export type ApiSearchItem = z.infer<typeof ApiSearchItemSchema>;

export function toProfile(user: ApiUser, summary: string | null): NonNullable<Snapshot["profile"]> {
  return {
    login: user.login,
    name: user.name,
    bio: user.bio,
    location: user.location,
    summary,
    followers: user.followers,
    publicRepos: user.public_repos,
    createdAt: user.created_at,
  };
}

const sortedRecord = (record: Record<string, number>) =>
  Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));

export function toRepo(api: ApiRepo, languages: Record<string, number>, hasReadme: boolean): Repo {
  return {
    name: api.name,
    fullName: api.full_name,
    description: api.description,
    language: api.language,
    languages: sortedRecord(languages),
    stars: api.stargazers_count,
    forks: api.forks_count,
    topics: [...(api.topics ?? [])].sort(),
    // GitHub returns "" for no homepage, and a homepage can be any text: keep it only if it is a real http(s) URL.
    homepage: api.homepage && isHttpUrl(api.homepage) ? api.homepage : null,
    createdAt: api.created_at,
    pushedAt: api.pushed_at,
    fork: api.fork,
    archived: api.archived,
    htmlUrl: api.html_url,
    defaultBranch: api.default_branch,
    hasReadme,
  };
}

/** "https://api.github.com/repos/owner/name" becomes "owner/name". */
export function repoFromApiUrl(url: string): string {
  const match = /\/repos\/([^/]+\/[^/]+)$/.exec(url);
  if (!match) throw new Error(`Unexpected repository URL: ${url}`);
  return match[1];
}

/** Returns null for a PR that was closed without being merged. */
export function toPullRequest(item: ApiSearchItem): PullRequest | null {
  const mergedAt = item.pull_request?.merged_at;
  if (!mergedAt) return null;
  return {
    repo: repoFromApiUrl(item.repository_url),
    number: item.number,
    title: item.title,
    url: item.html_url,
    mergedAt,
  };
}

/**
 * Keeps lines start..end (1-based, inclusive). Throws if the range is outside the file.
 * Windows line endings (CRLF) are converted to LF first: several of my older repos use them,
 * and a stray carriage return would show up in every displayed line.
 */
export function sliceLines(source: string, range?: [number, number]): string {
  const text = source.replace(/\r\n?/g, "\n");
  if (!range) return text.endsWith("\n") ? text : text + "\n";
  const [start, end] = range;
  const lines = text.split("\n");
  if (text.endsWith("\n")) lines.pop();
  if (start < 1 || end < start || end > lines.length) {
    throw new Error(`Line range ${start}-${end} is outside a file of ${lines.length} lines`);
  }
  return lines.slice(start - 1, end).join("\n") + "\n";
}

/**
 * Rules for secrets that must never reach a public page. The sync refuses to write a file that
 * matches, and reports only the kind, never the matched text.
 *
 * A rule may `ignore` a match that is clearly a placeholder or a reference to an environment
 * variable ("your_api_key_here", "process.env.KEY"), so documentation does not trip the guard.
 * Every quantifier is bounded, so hostile input cannot make a rule take quadratic time.
 */
interface SecretRule {
  label: string;
  pattern: RegExp;
  /** Receives the first capture group, or the whole match when there is none. */
  ignore?: (value: string) => boolean;
}

const PLACEHOLDER = /^(?:your|my|xxx|example|placeholder|changeme|change[_-]?me|todo|dummy|fake|sample|test|insert|enter|replace|none|null|undefined|secret|password|token)|x{6,}|_here$|[<>{}$]|\.\.\./i;
const ENV_REFERENCE = /(?:^|[._])(?:env|environ|getenv)(?:[._(]|$)|^import\.meta|^config\./i;
const looksLikePlaceholder = (value: string) => PLACEHOLDER.test(value) || ENV_REFERENCE.test(value) || /^(.)\1+$/.test(value);
/** Real keys contain a digit and a letter; an identifier such as `someFunctionName` does not. */
const hasDigitAndLetter = (value: string) => /\d/.test(value) && /[A-Za-z]/.test(value);
/** `pool.token0Address`, `this.config.apiKey`, `deriveSecretKey2`: a reference in code, not a value. */
const looksLikeCode = (value: string) => /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+$/.test(value) || /^[A-Za-z_][A-Za-z_]*\d{0,3}$/.test(value);

const KEY_NAME = String.raw`[A-Za-z0-9_]{0,40}(?:API[_-]?KEY|APIKEY|SECRET|TOKEN|PRIVATE[_-]?KEY|ACCESS[_-]?KEY|AUTH)[A-Za-z0-9_]{0,40}`;
const PASSWORD_NAME = String.raw`[A-Za-z0-9_]{0,40}(?:PASSWORD|PASSWD|PWD)[A-Za-z0-9_]{0,40}`;

const SECRET_RULES: SecretRule[] = [
  { label: "private key block", pattern: /-----BEGIN [A-Z ]{0,30}PRIVATE KEY-----/ },
  // A password in a URL is fine when the host is the developer's own machine (setup examples), never otherwise.
  { label: "database URL with a password", pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s@/]{3,}@(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|host\.docker\.internal)(?=[:/?#\s"'`)]|$))/i },
  { label: "key in an RPC URL", pattern: /https?:\/\/[a-z0-9.-]{1,80}(?:alchemy\.com|infura\.io|quiknode\.pro)\/(?:v\d\/)?[A-Za-z0-9_-]{16,}/i },
  { label: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "AWS secret key", pattern: /aws_?secret_?access_?key["']?\s{0,5}[:=]\s{0,5}["']?[A-Za-z0-9/+=]{40}\b/i },
  { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { label: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { label: "Slack token", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { label: "Stripe key", pattern: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { label: "OpenAI-style key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { label: "npm token", pattern: /\bnpm_[A-Za-z0-9]{30,}/ },
  { label: "JSON Web Token", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { label: "bearer token", pattern: /\bBearer\s{1,5}([A-Za-z0-9._~+/-]{20,})=*/i, ignore: looksLikePlaceholder },
  { label: "private key in an assignment", pattern: /(?:private|secret|priv)[_-]?key["']?\s{0,5}[:=]\s{0,5}["']?(?:0x)?[0-9a-fA-F]{64}\b/i },
  { label: "recovery phrase", pattern: /(?:mnemonic|seed[ _-]?phrase|recovery[ _-]?phrase)["']?\s{0,5}[:=]\s{0,5}["']?(?:[a-z]{3,8}\s{1,3}){11,23}[a-z]{3,8}/i },
  { label: "RapidAPI key header", pattern: /x-rapidapi-key["']?\s{0,5}[:=]\s{0,5}["'][A-Za-z0-9]{16,}["']/i },
  // `NAME_KEY=value`, `"apiKey": "value"` or `export TOKEN=value`, with or without quotes.
  {
    label: "hard-coded credential",
    pattern: new RegExp(String.raw`\b${KEY_NAME}["']?\s{0,5}[:=]\s{0,5}["']?([A-Za-z0-9_\-./+=]{16,})`, "i"),
    ignore: (value) => looksLikePlaceholder(value) || looksLikeCode(value) || !hasDigitAndLetter(value),
  },
  // Passwords are often words (a passphrase), so no digit is required, but the value must be long.
  {
    label: "hard-coded password",
    pattern: new RegExp(String.raw`\b${PASSWORD_NAME}["']?\s{0,5}[:=]\s{0,5}["']?([^\s"'\`$<>{}(),;]{10,})`, "i"),
    ignore: (value) => looksLikePlaceholder(value) || looksLikeCode(value),
  },
];

/** Labels of every secret-looking pattern found in a text. Empty when it looks clean. */
export function scanForSecrets(text: string): string[] {
  const found: string[] = [];
  for (const rule of SECRET_RULES) {
    const pattern = new RegExp(rule.pattern.source, `${rule.pattern.flags.replace("g", "")}g`);
    for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
      if (!rule.ignore?.(match[1] ?? match[0])) {
        found.push(rule.label);
        break;
      }
      if (match[0] === "") pattern.lastIndex += 1;
    }
  }
  return found;
}

const byNewest = (a: string, b: string) => b.localeCompare(a);

/** One fixed order, so identical data always serialises identically. */
export function sortSnapshot(snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    repos: [...snapshot.repos].sort((a, b) => byNewest(a.pushedAt, b.pushedAt) || a.name.localeCompare(b.name)),
    pullRequests: [...snapshot.pullRequests].sort(
      (a, b) => byNewest(a.mergedAt, b.mergedAt) || a.repo.localeCompare(b.repo) || a.number - b.number,
    ),
    demos: [...snapshot.demos].sort((a, b) => a.url.localeCompare(b.url)),
  };
}

/**
 * The part of a snapshot that decides whether anything really changed.
 * `syncedAt` and each demo's `checkedAt` move on every run, so they are left out;
 * otherwise the weekly job would commit every week. So is the last push to this site's own
 * repository (`ownRepo`, owner/name): the job's own push moves it, so keeping it would make
 * every run find a change caused by the run before.
 */
export function comparable(snapshot: Snapshot, ownRepo?: string): unknown {
  const own = ownRepo?.toLowerCase();
  return {
    ...snapshot,
    syncedAt: null,
    // Ordered by name, not by last push: otherwise a new push to this repo would still change its
    // position in the list after its pushedAt is hidden.
    repos: snapshot.repos
      .map((repo) => (repo.fullName.toLowerCase() === own ? { ...repo, pushedAt: null } : repo))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    demos: snapshot.demos.map((demo: Demo) => ({ ...demo, checkedAt: null })),
  };
}

export function snapshotsDiffer(previous: Snapshot, next: Snapshot, ownRepo?: string): boolean {
  return JSON.stringify(comparable(sortSnapshot(previous), ownRepo)) !== JSON.stringify(comparable(sortSnapshot(next), ownRepo));
}

export const serializeSnapshot = (snapshot: Snapshot) => JSON.stringify(sortSnapshot(snapshot), null, 2) + "\n";
