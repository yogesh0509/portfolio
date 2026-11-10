/**
 * Minimal GitHub client for the sync script. Works without a token (60 API
 * requests/hour); with GITHUB_TOKEN the limit is 5,000/hour.
 * Raw file downloads from raw.githubusercontent.com do not count against the API limit.
 */

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface GitHubClient {
  /** GET an API path and parse the JSON body. */
  json(path: string): Promise<unknown>;
  /** GET a raw file. Returns null for a 404. */
  raw(repo: string, ref: string, path: string): Promise<string | null>;
  /** Number of API (not raw) requests made so far. */
  readonly apiCalls: number;
}

export function createClient(options: { token?: string; fetchImpl?: typeof fetch } = {}): GitHubClient {
  const doFetch = options.fetchImpl ?? fetch;
  let apiCalls = 0;

  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "yogesh0509-portfolio-sync",
    "x-github-api-version": "2022-11-28",
  };
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  return {
    get apiCalls() {
      return apiCalls;
    },

    async json(path) {
      apiCalls += 1;
      const res = await doFetch(`https://api.github.com${path}`, { headers });
      if (res.status === 403 || res.status === 429) {
        const reset = res.headers.get("x-ratelimit-reset");
        const when = reset ? new Date(Number(reset) * 1000).toISOString() : "later";
        throw new GitHubError(
          `GitHub rate limit hit on ${path}. It resets at ${when}. Set GITHUB_TOKEN for a higher limit.`,
          res.status,
        );
      }
      if (!res.ok) throw new GitHubError(`GitHub returned ${res.status} for ${path}`, res.status);
      return res.json();
    },

    async raw(repo, ref, path) {
      const url = `https://raw.githubusercontent.com/${repo}/${ref}/${path}`;
      const res = await doFetch(url, { headers: { "user-agent": headers["user-agent"] } });
      if (res.status === 404) return null;
      if (!res.ok) throw new GitHubError(`raw.githubusercontent.com returned ${res.status} for ${url}`, res.status);
      return res.text();
    },
  };
}
