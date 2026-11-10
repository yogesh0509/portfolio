import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as config from "../../content/config";
import { EMPTY_SNAPSHOT, SnapshotSchema, type Snapshot } from "../github/schema";
import { buildVfs } from "./build";
import { getBuildInfo } from "../build-info.server";
import { resolveProfile, type SiteProfile } from "../profile";
import { ResumeSchema, type ResumeSection } from "../resume/schema";
import { buildContracts } from "../chain/contracts.server";
import { buildTerminalData, type TerminalData } from "../terminal/data";
import { pathKey } from "./paths";
import { toExplorer, walkFiles } from "./tree";
import type { ExplorerNode, VfsDir, VfsFile } from "./types";

/** Build-time only: reads content/ and data/ from disk. Never import this from client code. */
const root = process.cwd();

function read(relPath: string): string | null {
  const full = join(root, relPath);
  return existsSync(full) ? readFileSync(full, "utf8") : null;
}

export function loadSnapshot(): Snapshot {
  const raw = read("data/github.json");
  if (raw === null) return EMPTY_SNAPSHOT;
  return SnapshotSchema.parse(JSON.parse(raw));
}

export interface ResumeData {
  experience: config.ExperienceEntry[];
  education: config.EducationEntry[];
  skills: { group: string; items: string[] }[];
  /** The PDF's other sections (projects, research...). Empty when the PDF is not used. */
  sections: ResumeSection[];
  /** True when the three lists above come from the résumé PDF, false when from content/config.ts. */
  fromPdf: boolean;
  /** The public résumé PDF, when the sync could read it. */
  pdfUrl: string | null;
}

let cachedResume: ResumeData | undefined;

/**
 * The résumé as the site shows it. The PDF's data (data/resume.json, written by the sync) is used only
 * when its experience, education and skills all parsed; otherwise all three come from
 * content/config.ts, so the site never mixes a half-finished résumé with the fallback.
 */
export function getResume(): ResumeData {
  if (cachedResume) return cachedResume;
  const raw = read("data/resume.json");
  const parsed = raw === null ? null : ResumeSchema.safeParse(JSON.parse(raw));
  if (parsed && !parsed.success) console.warn(`data/resume.json is not valid, so the résumé uses content/config.ts: ${parsed.error.message}`);
  const pdf = parsed?.success ? parsed.data : null;
  const fallback = { experience: config.experience, education: config.education, skills: config.skills, sections: [], fromPdf: false };
  if (pdf?.experience && pdf.education && pdf.skills) {
    cachedResume = { experience: pdf.experience, education: pdf.education, skills: pdf.skills, sections: pdf.sections, fromPdf: true, pdfUrl: pdf.pdfUrl };
  } else {
    cachedResume = { ...fallback, pdfUrl: pdf?.pdfUrl ?? null };
  }
  return cachedResume;
}

let cachedProfile: SiteProfile | undefined;

/** content/config.ts joined with my GitHub profile. Throws, naming the field, when GitHub lacks one. */
export function getProfile(): SiteProfile {
  const resumeUrl = getResume().pdfUrl ?? config.profile.resumeUrl;
  cachedProfile ??= resolveProfile({ ...config.profile, resumeUrl }, loadSnapshot().profile);
  return cachedProfile;
}

let cached: VfsDir | undefined;

export function getVfs(): VfsDir {
  const { experience, education, skills, sections } = getResume();
  cached ??= buildVfs({
    config: { ...config, profile: getProfile(), experience, education, skills, resumeSections: sections },
    snapshot: loadSnapshot(),
    read,
  });
  return cached;
}

export function allFiles(): VfsFile[] {
  return walkFiles(getVfs());
}

export function explorerTree(): ExplorerNode[] {
  return getVfs().children.map(toExplorer);
}

/** Everything the terminal's commands read, served as /vfs/terminal.json. */
export function getTerminalData(): TerminalData {
  return buildTerminalData({
    system: config.system,
    profile: getProfile(),
    build: getBuildInfo(),
    experience: getResume().experience,
    education: getResume().education,
    skills: getResume().skills,
    projects: config.projects,
    excludedRepos: config.excludedRepos,
    contracts: buildContracts(config.projects),
    snapshot: loadSnapshot(),
  });
}

/** The text of every file by lower-cased path, served as /vfs/content.json for `cat`. */
export function contentIndex(): Record<string, string> {
  return Object.fromEntries(allFiles().map((f) => [pathKey(f.path), f.content]));
}
