import type { Metadata } from "next";
import { Ubuntu_Sans, Ubuntu_Sans_Mono } from "next/font/google";
import "./globals.css";

import { projects, system } from "@/content/config";
import Workbench from "@/components/workbench/Workbench";
import { WorkbenchProvider } from "@/components/workbench/WorkbenchProvider";
import { getBuildInfo } from "@/lib/build-info.server";
import { buildPorts } from "@/lib/ports";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { explorerTree, getProfile, loadSnapshot } from "@/lib/vfs/load.server";

const profile = getProfile();

const sans = Ubuntu_Sans({ subsets: ["latin"], variable: "--font-ubuntu-sans", display: "swap" });
const mono = Ubuntu_Sans_Mono({ subsets: ["latin"], variable: "--font-ubuntu-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${profile.name} (${SITE_NAME})`, template: `%s - ${SITE_NAME}` },
  description: `${profile.name}: ${profile.summary}`,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE_NAME, url: SITE_URL, title: `${profile.name} (${SITE_NAME})`, description: profile.summary },
  twitter: { card: "summary", title: `${profile.name} (${SITE_NAME})`, description: profile.summary },
};

/** Structured data for search engines. No email or phone: only what is already public on my profiles. */
const personJson = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: SITE_URL,
  sameAs: [profile.github, profile.linkedin],
  description: profile.summary,
}).replace(/</g, "\\u003c");

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const snapshot = loadSnapshot();

  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJson }} />
        <WorkbenchProvider
          data={{
            tree: explorerTree(),
            ports: buildPorts(projects, snapshot.demos),
            build: getBuildInfo(),
            syncedAt: snapshot.syncedAt,
            profile: {
              name: profile.name,
              handle: profile.handle,
              email: profile.email,
              github: profile.github,
              linkedin: profile.linkedin,
              resumeUrl: profile.resumeUrl,
            },
            system,
          }}
        >
          <Workbench>{children}</Workbench>
        </WorkbenchProvider>
      </body>
    </html>
  );
}
