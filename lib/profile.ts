import type { Snapshot } from "./github/schema";

/** What the site says about me. Pure: no disk access, so client code may import the type. */
export interface SiteProfile {
  name: string;
  handle: string;
  /** My GitHub bio. */
  headline: string;
  /** The marked summary in my GitHub profile README. */
  summary: string;
  location: string;
  email: string;
  github: string;
  linkedin: string;
  resumeUrl: string;
}

/** The fields that stay in content/config.ts: links and addresses, not prose. */
export type ConfigProfile = Omit<SiteProfile, "name" | "headline" | "summary" | "location">;

/**
 * Joins content/config.ts with my GitHub profile from the snapshot. The prose comes only from
 * GitHub, so the site and GitHub cannot disagree; a missing value stops the build instead of
 * silently falling back to an older text.
 */
export function resolveProfile(config: ConfigProfile, github: Snapshot["profile"]): SiteProfile {
  const missing = (field: string, fix: string) =>
    new Error(`data/github.json has no ${field}. ${fix} Then run \`npm run sync\`.`);
  if (!github) throw missing("profile", "The sync has not run yet.");
  if (!github.name) throw missing("profile name", "Set your name on github.com/settings/profile.");
  if (!github.bio) throw missing("bio (used as the headline)", "Set your bio on github.com/settings/profile.");
  if (!github.location) throw missing("location", "Set your location on github.com/settings/profile.");
  if (!github.summary) {
    throw missing("summary", "Mark it in your profile README with <!-- portfolio:summary -->...<!-- /portfolio:summary -->.");
  }
  return { ...config, name: github.name, headline: github.bio, summary: github.summary, location: github.location };
}
