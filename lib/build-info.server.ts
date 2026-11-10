import { execFileSync } from "node:child_process";
import { SITE_REPO } from "./site";

/** What the status bar shows about this deployment. Resolved once, at build time. */
export interface BuildInfo {
  /** Full commit SHA, or "" when it cannot be determined. */
  commit: string;
  branch: string;
  repoUrl: string;
}

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

export function getBuildInfo(): BuildInfo {
  return {
    // Vercel sets these during a deployment build; locally fall back to git.
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? gitOutput(["rev-parse", "HEAD"]),
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? (gitOutput(["rev-parse", "--abbrev-ref", "HEAD"]) || "main"),
    repoUrl: `https://github.com/${SITE_REPO}`,
  };
}
