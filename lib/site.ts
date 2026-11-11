/**
 * Canonical site URL, used by canonical links and share previews.
 * It is the address already set as the repo's homepage; the domain is renewed
 * separately and nothing here changes DNS or hosting.
 */
export const SITE_URL = "https://www.yogesh0509.info";
export const SITE_NAME = "yogesh0509";

/** This site's own GitHub repository, owner/name. Renamed from portfolio-yogesh0509 in November 2026. */
export const SITE_REPO = "yogesh0509/portfolio";

/**
 * True for this site's own repo. Its last push is the weekly sync's, not mine, so it is left out of every
 * "recent activity" measure (the welcome page, the login message, `apt list --upgradable`, the last push).
 */
export const isSiteRepo = (fullName: string): boolean => fullName.toLowerCase() === SITE_REPO.toLowerCase();
