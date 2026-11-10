import type { Metadata } from "next";
import Link from "next/link";
import PrintButton from "@/components/editor/PrintButton";
import { projects } from "@/content/config";
import { safeHref } from "@/lib/safe-url";
import { formatMonth } from "@/lib/vfs/build";
import { getProfile, getResume } from "@/lib/vfs/load.server";

const profile = getProfile();
const { experience, education, skills, sections } = getResume();

export const metadata: Metadata = {
  title: "Résumé",
  description: `${profile.name}: ${profile.headline}`,
  alternates: { canonical: "/resume" },
};

const range = (from: string, to: string | null) => `${formatMonth(from)} to ${to ? formatMonth(to) : "present"}`;

/**
 * The résumé, built from the same data as the rest of the site (and as resume.json), so the two
 * cannot drift apart: my résumé PDF when the sync could read all of it, otherwise
 * content/config.ts. The phone number in the PDF is deliberately not here.
 */
export default function ResumePage() {
  return (
    <article id="resume-print" className="resume mx-auto max-w-3xl px-6 py-8 leading-relaxed">
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton />
        {profile.resumeUrl && (
          <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-2">
            Download the PDF
          </a>
        )}
        <Link href="/resume.json" className="text-sm underline underline-offset-2">
          View as JSON Resume
        </Link>
      </div>

      <header>
        <h1 className="text-3xl font-semibold">{profile.name}</h1>
        <p className="mt-1">{profile.headline}</p>
        <p className="mt-2 text-sm">
          {profile.location} · <a href={`mailto:${profile.email}`}>{profile.email}</a> · <a href={profile.github}>github.com/{profile.handle}</a> ·{" "}
          <a href={profile.linkedin}>linkedin.com/in/{profile.handle}</a>
        </p>
      </header>

      <section aria-labelledby="r-summary">
        <h2 id="r-summary">Summary</h2>
        <p>{profile.summary}</p>
      </section>

      <section aria-labelledby="r-experience">
        <h2 id="r-experience">Experience</h2>
        {experience.map((entry) => (
          <div key={entry.id} className="mb-4 break-inside-avoid">
            <h3>
              {entry.org}, {entry.place}
            </h3>
            {entry.roles.map((role) => (
              <p key={role.from} className="text-sm">
                <strong>{role.title}</strong>, {range(role.from, role.to)}
              </p>
            ))}
            {entry.stack && entry.stack.length > 0 && <p className="text-sm">Tech stack: {entry.stack.join(", ")}</p>}
            {entry.bullets.length > 0 && (
              <ul>
                {entry.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {sections.length > 0 ? (
        sections.map((section, s) => (
          <section key={section.title} aria-labelledby={`r-section-${s}`}>
            <h2 id={`r-section-${s}`}>{section.title}</h2>
            {section.entries.map((entry, e) => (
              <div key={e} className="mb-3 break-inside-avoid">
                <h3>
                  {entry.title}
                  {entry.period && <span className="font-normal">, {entry.period}</span>}
                </h3>
                {(entry.notes.length > 0 || entry.links.length > 0) && (
                  <p className="text-sm">
                    {entry.notes.join(" · ")}
                    {entry.notes.length > 0 && entry.links.length > 0 && " · "}
                    {entry.links.map((link, l) => (
                      <span key={link.url}>
                        {l > 0 && " · "}
                        <a href={safeHref(link.url)}>{link.label}</a>
                      </span>
                    ))}
                  </p>
                )}
                {entry.stack.length > 0 && <p className="text-sm">Tech stack: {entry.stack.join(", ")}</p>}
                {entry.bullets.length > 0 && (
                  <ul>
                    {entry.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        ))
      ) : (
        <section aria-labelledby="r-work">
          <h2 id="r-work">Selected work</h2>
          <ul>
            {projects.map((project) => (
              <li key={project.slug}>
                <strong>{project.title}</strong> ({project.period}): {project.tagline}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="r-education">
        <h2 id="r-education">Education</h2>
        {education.map((e) => (
          <p key={`${e.school}-${e.degree}`}>
            {e.degree}, {e.school}, {e.place}, {e.from} to {e.to}
            {e.notes && e.notes.length > 0 && <>. {e.notes.join(", ")}</>}
          </p>
        ))}
      </section>

      <section aria-labelledby="r-skills">
        <h2 id="r-skills">Skills</h2>
        <ul>
          {skills.map((group) => (
            <li key={group.group}>
              <strong>{group.group}:</strong> {group.items.join(", ")}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
