import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";
import { NETWORKS } from "./lib/chain/networks";

/**
 * The browser may only contact the origins listed in connect-src of the Content-Security-Policy in
 * vercel.json. A network added to lib/chain/networks.ts without its origin there would be blocked in
 * production but work in `next dev`, so the build refuses to start until the two agree. Like the
 * relative import above, it resolves against the working directory, so run Next from the repo root.
 */
function assertCspAllowsNetworks(): void {
  const vercel = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as {
    headers?: { headers?: { key: string; value: string }[] }[];
  };
  const csp = vercel.headers?.flatMap((rule) => rule.headers ?? []).find((h) => h.key === "Content-Security-Policy")?.value;
  if (!csp) throw new Error("vercel.json: no Content-Security-Policy header found");
  const connectSrc = new Set(/(?:^|;)\s*connect-src\s+([^;]*)/.exec(csp)?.[1].trim().split(/\s+/) ?? []);
  // Bitcoin is read through its explorer's API; the other networks through their RPC endpoint.
  const missing = Object.values(NETWORKS)
    .map((network) => new URL(network.kind === "bitcoin" ? network.explorer : network.rpc).origin)
    .filter((origin) => !connectSrc.has(origin));
  if (missing.length > 0) {
    throw new Error(`vercel.json: connect-src in the Content-Security-Policy is missing ${[...new Set(missing)].join(", ")} (from lib/chain/networks.ts)`);
  }
}

assertCspAllowsNetworks();

const nextConfig: NextConfig = {
  // Fully static site: `next build` writes plain HTML to out/ and fails if anything
  // needs a server at request time (Server Actions, dynamic routes without params).
  output: "export",
};

export default nextConfig;
