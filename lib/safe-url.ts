/**
 * Links in this site come from data (GitHub and the config). Only these kinds may become a
 * clickable href: absolute http(s) and mailto URLs, and paths inside this site. Anything else, such
 * as `javascript:` or `data:`, is dropped, so a poisoned data file can never produce a script link.
 */

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Returns the URL if it is safe to use as a link target, otherwise undefined. */
export function safeHref(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  // A path inside this site: one leading slash, not a protocol-relative "//host" URL.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) return trimmed;
  if (/^mailto:[^\s]+$/i.test(trimmed)) return trimmed;
  return isHttpUrl(trimmed) ? trimmed : undefined;
}
