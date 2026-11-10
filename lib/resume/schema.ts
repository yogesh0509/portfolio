import { z } from "zod";
import { isHttpUrl } from "../safe-url";

/**
 * Shape of data/resume.json: what the sync read from my résumé's public PDF.
 * A section that could not be read is null, and the site then falls back to content/config.ts.
 */

const httpUrl = z.string().refine(isHttpUrl, "must be an http(s) URL");
const text = z.string().min(1).max(600);
const month = z.string().regex(/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/);

export const RoleSchema = z.object({ title: text, from: month, to: month.nullable() });

export const ExperienceSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  org: text,
  place: text,
  roles: z.array(RoleSchema).min(1),
  stack: z.array(text),
  bullets: z.array(text),
});

export const EducationSchema = z.object({
  school: text,
  place: text,
  degree: text,
  notes: z.array(text),
  from: z.number().int(),
  to: z.number().int(),
});

export const SkillGroupSchema = z.object({ group: text, items: z.array(text).min(1) });

export const LinkSchema = z.object({ label: text, url: httpUrl });

/** Any other section of the résumé (projects, open source, research...), kept as written. */
export const SectionSchema = z.object({
  title: text,
  entries: z.array(
    z.object({
      title: text,
      /** The date or range as written, e.g. "Jan 2025 – Feb 2025". */
      period: text.nullable(),
      stack: z.array(text),
      links: z.array(LinkSchema),
      notes: z.array(text),
      bullets: z.array(text),
    }),
  ),
});

export const ResumeSchema = z.object({
  schemaVersion: z.literal(1),
  /** The public PDF the data was read from, linked as "Download the PDF". */
  pdfUrl: httpUrl,
  experience: z.array(ExperienceSchema).min(1).nullable(),
  education: z.array(EducationSchema).min(1).nullable(),
  skills: z.array(SkillGroupSchema).min(1).nullable(),
  sections: z.array(SectionSchema),
  /** Why a section is null or was left out, in plain words. Shown in the sync's summary. */
  notes: z.array(z.string()),
});

export type Resume = z.infer<typeof ResumeSchema>;
export type ResumeSection = z.infer<typeof SectionSchema>;
