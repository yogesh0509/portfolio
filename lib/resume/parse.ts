import type { ExperienceEntry } from "../../content/config";
import { isHttpUrl } from "../safe-url";
import { ResumeSchema, type Resume, type ResumeSection } from "./schema";

/**
 * Reads my résumé from the lines of its public PDF (see lib/resume/pdf.ts), which I export from my
 * Google Doc. The Doc follows the layout in ~/.claude/skills/gdoc-resume/references/conventions.md,
 * which puts the PDF first: a capitalised title per section, fields separated by " | ", the date as
 * the last field of its line, and bullets for details:
 *
 *   EXPERIENCE
 *   athenahealth | Bengaluru, India                       organisation | place
 *   Member of Technical Staff | Oct 2026 – Present        role | dates (newest role first)
 *   Tech stack: Java, Spring Boot, React                  optional
 *   ● Built ...                                           bullets
 *
 *   EDUCATION
 *   BMS College of Engineering | Bengaluru, India
 *   B.E., Information Science and Engineering | CGPA 8.7/10 | 2021 – 2025
 *
 *   SKILLS
 *   ● Languages: Rust, Solidity, TypeScript
 *
 * Every other section (projects, open source, research...) is a title line, optional
 * "Tech stack:" line and bullets. Everything before the first section (name, contact line, phone)
 * is ignored and never stored. A section that does not fit is reported and left out, and the site
 * then falls back to content/config.ts rather than show half-read text.
 */

export type Line = { kind: "line" | "bullet"; text: string; links: { label: string; url: string }[] } | { kind: "error"; text: string };

const SECTIONS: Record<string, string> = {
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  education: "education",
  skills: "skills",
  "technical skills": "skills",
  projects: "Projects",
  "open source": "Open source",
  "open source contributions": "Open source",
  hackathons: "Hackathons",
  research: "Research",
  publications: "Publications",
  certifications: "Certifications",
  awards: "Awards",
  achievements: "Achievements",
  summary: "Summary",
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

class SectionError extends Error {}

/** One display line: no zero-width or non-breaking oddities, single spaces. */
function clean(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u200b-\u200d\u2060\ufeff\u00ad]/g, "")
    .replace(/[\u00a0\u2000-\u200a\u202f\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The section a line opens: a line that is just a known section title, in capitals. */
function sectionOf(line: Line): string | null {
  if (line.kind !== "line" || line.text !== line.text.toUpperCase()) return null;
  const key = line.text.toLowerCase().replace(/[^a-z ]/g, "").trim();
  return SECTIONS[key] ?? null;
}

const fields = (text: string) => text.split(/\s*\|\s*/).map(clean).filter(Boolean);

function parseDate(text: string): { year: number; month: number | null } | null {
  const match = /^(?:([a-z]+)\.?\s+)?((?:19|20)\d{2})$/i.exec(text.trim());
  if (!match) return null;
  const month = match[1] ? MONTHS.indexOf(match[1].slice(0, 3).toLowerCase()) + 1 : null;
  if (month === 0) return null;
  return { year: Number(match[2]), month };
}

const DATEISH = /\b(?:19|20)\d{2}\b|\bpresent\b/i;

/** "Oct 2026 – Present", "2021 - 2025", "2026". Null when the text is not a date. */
function parseRange(text: string): { from: { year: number; month: number | null }; to: { year: number; month: number | null } | null } | null {
  const parts = text.split(/\s*(?:–|—|-|\bto\b)\s*/i);
  if (parts.length === 1) {
    const single = parseDate(parts[0]);
    return single ? { from: single, to: single } : null;
  }
  if (parts.length !== 2) return null;
  const from = parseDate(parts[0]);
  const ongoing = /^(?:present|current|now)$/i.test(parts[1].trim());
  const to = ongoing ? null : parseDate(parts[1]);
  if (!from || (!ongoing && !to)) return null;
  return { from, to };
}

const ym = (d: { year: number; month: number | null }) => `${d.year}-${String(d.month).padStart(2, "0")}`;

/** "Java, Spring Boot (REST), Framework/Libraries: React." -> ["Java", "Spring Boot (REST)", "React"] */
function splitItems(text: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text.replace(/\.\s*$/, "")) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      items.push(current);
      current = "";
    } else current += ch;
  }
  items.push(current);
  const seen = new Set<string>();
  return items
    .map((item) => clean(item.replace(/^[^:,()]{1,40}:\s*/, "")))
    .filter((item) => item && !seen.has(item.toLowerCase()) && seen.add(item.toLowerCase()));
}

/** Organisation name up to the first " (", "," or dash, as a URL slug. */
const slug = (org: string) =>
  org
    .split(/\s+[(\-–—]|,/)[0]
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function looksLikePhone(text: string): boolean {
  for (const match of text.matchAll(/\+?\d[\d .()-]{8,}\d/g)) {
    const digits = match[0].replace(/\D/g, "");
    if (digits.length >= 10 && !/^(?:(?:19|20)\d{2})+$/.test(digits)) return true;
  }
  return false;
}

function guard(value: unknown, where: string): void {
  const texts = JSON.stringify(value).match(/"(?:[^"\\]|\\.)*"/g) ?? [];
  if (texts.some((t) => !/^"https?:/.test(t) && looksLikePhone(t))) {
    throw new SectionError(`${where} contains what looks like a phone number`);
  }
}

type Experience = NonNullable<Resume["experience"]>[number];

function needsRole(entry: Experience | null): void {
  if (entry && entry.roles.length === 0) throw new SectionError(`"${entry.org}" has no role line ("Title | Mon YYYY – Present")`);
}

function parseExperience(lines: Line[], fallback: ExperienceEntry[]): Experience[] {
  const entries: Experience[] = [];
  let current: Experience | null = null;
  for (const line of lines) {
    if (line.kind === "error") throw new SectionError(line.text);
    if (line.kind === "bullet") {
      if (!current || current.roles.length === 0) throw new SectionError(`the bullet "${line.text.slice(0, 40)}" comes before any role line`);
      current.bullets.push(line.text);
      continue;
    }
    if (/^tech\s*stack\s*:/i.test(line.text)) {
      if (!current || current.roles.length === 0) throw new SectionError(`"${line.text.slice(0, 40)}" comes before any role line`);
      current.stack = splitItems(line.text.replace(/^tech\s*stack\s*:/i, ""));
      continue;
    }
    const parts = fields(line.text);
    const last = parts[parts.length - 1];
    const range = parseRange(last);
    if (range) {
      if (!current) throw new SectionError(`the role "${line.text}" has no "Organisation | Place" line above it`);
      if (current.bullets.length > 0 || current.stack.length > 0) throw new SectionError(`the role "${line.text}" comes after bullets; add its organisation line first`);
      if (parts.length < 2) throw new SectionError(`"${line.text}" has a date but no title before it`);
      if (!range.from.month || (range.to && !range.to.month)) throw new SectionError(`write months for "${line.text}" ("Oct 2026 – Present")`);
      const role = { title: parts.slice(0, -1).join(" | "), from: ym(range.from), to: range.to ? ym(range.to) : null };
      const previous = current.roles[current.roles.length - 1];
      if (previous && previous.from < role.from) throw new SectionError(`roles at "${current.org}" must be listed newest first`);
      current.roles.push(role);
    } else if (DATEISH.test(last)) {
      throw new SectionError(`cannot read the date "${last}" (write "Mon YYYY – Mon YYYY" or "– Present")`);
    } else {
      needsRole(current);
      if (parts.length < 2) throw new SectionError(`"${line.text}" needs a place: "Organisation | City, Country"`);
      const own = slug(parts[0]);
      // Keep the existing /experience/<id>.md address when the organisation is already listed in config.ts.
      const id = fallback.find((entry) => slug(entry.org) === own)?.id ?? own;
      if (!id) throw new SectionError(`cannot make a file name from "${parts[0]}"`);
      if (entries.some((entry) => entry.id === id)) throw new SectionError(`"${parts[0]}" appears twice`);
      current = { id, org: parts[0], place: parts.slice(1).join(", "), roles: [], stack: [], bullets: [] };
      entries.push(current);
    }
  }
  needsRole(current);
  if (entries.length === 0) throw new SectionError("has no entries");
  return entries;
}

function parseEducation(lines: Line[]) {
  const entries: NonNullable<Resume["education"]> = [];
  let school: { name: string; place: string } | null = null;
  for (const line of lines) {
    if (line.kind === "error") throw new SectionError(line.text);
    if (line.kind === "bullet") continue; // coursework and the like: not shown on the site
    const parts = fields(line.text);
    const range = parseRange(parts[parts.length - 1]);
    if (range && parts.length >= 2) {
      if (!school) throw new SectionError(`"${line.text}" has no "School | Place" line above it`);
      if (!range.to) throw new SectionError(`give the final year for "${line.text}"`);
      entries.push({ school: school.name, place: school.place, degree: parts[0], notes: parts.slice(1, -1), from: range.from.year, to: range.to.year });
    } else if (DATEISH.test(parts[parts.length - 1])) {
      throw new SectionError(`cannot read the date in "${line.text}"`);
    } else {
      if (parts.length < 2) throw new SectionError(`"${line.text}" needs a place: "School | City, Country"`);
      school = { name: parts[0], place: parts.slice(1).join(", ") };
    }
  }
  if (entries.length === 0) throw new SectionError('has no degree line ("Degree | YYYY – YYYY")');
  return entries;
}

function parseSkills(lines: Line[]) {
  const groups: NonNullable<Resume["skills"]> = [];
  for (const line of lines) {
    if (line.kind === "error") throw new SectionError(line.text);
    const match = /^([^:]{1,60}):\s*(.+)$/.exec(line.text);
    if (!match) throw new SectionError(`"${line.text.slice(0, 40)}" is not "Group: item, item"`);
    const items = splitItems(match[2]);
    if (items.length > 0) groups.push({ group: clean(match[1]), items });
  }
  if (groups.length === 0) throw new SectionError("has no groups");
  return groups;
}

function parseOther(title: string, lines: Line[]): ResumeSection {
  const entries: ResumeSection["entries"] = [];
  for (const line of lines) {
    if (line.kind === "error") throw new SectionError(line.text);
    const current = entries[entries.length - 1];
    if (line.kind === "bullet") {
      if (!current) throw new SectionError(`the bullet "${line.text.slice(0, 40)}" comes before any title line`);
      current.bullets.push(line.text);
      continue;
    }
    if (/^tech\s*stack\s*:/i.test(line.text) && current && current.stack.length === 0 && current.bullets.length === 0) {
      current.stack = splitItems(line.text.replace(/^tech\s*stack\s*:/i, ""));
      continue;
    }
    const parts = fields(line.text);
    const last = parts[parts.length - 1];
    const period = parts.length > 1 && parseRange(last) ? last : null;
    const entry: ResumeSection["entries"][number] = { title: parts[0], period, stack: [], links: [], notes: [], bullets: [] };
    for (const part of parts.slice(1, period ? -1 : undefined)) {
      const link = line.links.find((l) => l.label === part);
      if (/^tech\s*stack\s*:/i.test(part)) entry.stack = splitItems(part.replace(/^tech\s*stack\s*:/i, ""));
      else if (link) entry.links.push(link);
      else if (/^[\w-]+(?:\.[\w-]+)+(?:\/\S*)?$/.test(part) && isHttpUrl(`https://${part}`)) entry.links.push({ label: part, url: `https://${part}` });
      else entry.notes.push(part);
    }
    // A link on the title itself (e.g. a linked project name).
    const titleLink = line.links.find((l) => l.label === parts[0]);
    if (titleLink) entry.links.unshift(titleLink);
    entries.push(entry);
  }
  if (entries.length === 0) throw new SectionError("has no entries");
  return { title, entries };
}

/** The résumé in `lines`. `pdfUrl` is the public PDF's link, shown as "Download the PDF". */
export function parseResumeLines(lines: Line[], pdfUrl: string, fallbackExperience: ExperienceEntry[]): Resume {
  const groups: { name: string; lines: Line[] }[] = [];
  for (const line of lines) {
    const name = sectionOf(line);
    if (name) groups.push({ name, lines: [] });
    else if (groups.length > 0) groups[groups.length - 1].lines.push(line);
    // Before the first section: name, contact line, phone. Never stored.
  }

  const resume: Resume = {
    schemaVersion: 1,
    pdfUrl,
    experience: null,
    education: null,
    skills: null,
    sections: [],
    notes: [],
  };
  const seen = new Set<string>();
  for (const group of groups) {
    const label = group.name.toLowerCase();
    try {
      if (seen.has(group.name)) throw new SectionError("appears twice");
      seen.add(group.name);
      if (group.name === "experience") resume.experience = parseExperience(group.lines, fallbackExperience);
      else if (group.name === "education") resume.education = parseEducation(group.lines);
      else if (group.name === "skills") resume.skills = parseSkills(group.lines);
      else resume.sections.push(parseOther(group.name, group.lines));
      const value = group.name === "experience" ? resume.experience : group.name === "education" ? resume.education : group.name === "skills" ? resume.skills : resume.sections.at(-1);
      guard(value, label);
    } catch (error) {
      if (!(error instanceof SectionError)) throw error;
      if (group.name === "experience") resume.experience = null;
      else if (group.name === "education") resume.education = null;
      else if (group.name === "skills") resume.skills = null;
      else if (resume.sections.at(-1)?.title === group.name) resume.sections.pop();
      resume.notes.push(`${label}: not used, because it ${error.message}.`);
    }
  }
  for (const name of ["experience", "education", "skills"]) {
    if (!seen.has(name)) resume.notes.push(`${name}: the PDF has no ${name.toUpperCase()} section.`);
  }
  return ResumeSchema.parse(resume);
}
