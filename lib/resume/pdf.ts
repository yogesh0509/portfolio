import type { Line } from "./parse";

/**
 * Turns my résumé PDF (exported from the Google Doc) back into lines, the way a résumé parser would:
 * text items grouped by baseline, read top to bottom. Bullets ("●") start a bullet line, and a wrapped
 * bullet's next line (indented like the bullet text) joins it. Link annotations become the links of
 * the line their words are on.
 *
 * Only the sync imports this, so pdf.js never reaches the site's pages.
 */

const BULLET = /^[●○■□•▪◦‣∙]\s*/;

interface Item {
  text: string;
  x: number;
  y: number;
  width: number;
  link: string | null;
}

export async function pdfToLines(data: Uint8Array): Promise<Line[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data, verbosity: 0 });
  const pdf = await task.promise;
  const lines: Line[] = [];
  let bulletOpen = false;
  for (let n = 1; n <= pdf.numPages; n += 1) {
    const page = await pdf.getPage(n);
    const annotations = (await page.getAnnotations()) as { subtype: string; url?: string; rect: number[] }[];
    const links = annotations.filter((a) => a.subtype === "Link" && a.url);
    const items: Item[] = [];
    for (const raw of (await page.getTextContent()).items) {
      if (!("str" in raw) || raw.str === "") continue;
      const [x, y] = [raw.transform[4], raw.transform[5]];
      const cx = x + raw.width / 2;
      const cy = y + raw.height / 2;
      const link = links.find((a) => cx >= a.rect[0] && cx <= a.rect[2] && cy >= a.rect[1] && cy <= a.rect[3]);
      items.push({ text: raw.str, x, y, width: raw.width, link: link?.url ?? null });
    }

    // Group by baseline (top to bottom), then order each line left to right.
    const rows: Item[][] = [];
    for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const row = rows.find((r) => Math.abs(r[0].y - item.y) < 2);
      if (row) row.push(item);
      else rows.push([item]);
    }
    const margin = Math.min(...rows.map((r) => Math.min(...r.map((i) => i.x))));

    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      let text = "";
      const lineLinks: { label: string; url: string }[] = [];
      let end = -Infinity;
      for (const item of row) {
        // pdf.js usually emits spaces as their own items; add one where the gap shows a word break.
        if (text && item.x - end > 1.5 && !/\s$/.test(text) && !/^\s/.test(item.text)) text += " ";
        text += item.text;
        end = item.x + item.width;
        const last = lineLinks[lineLinks.length - 1];
        if (item.link && last?.url === item.link) last.label += item.text;
        else if (item.link) lineLinks.push({ label: item.text, url: item.link });
      }
      const clean = text.replace(/[​-‍⁠﻿­]/g, "").replace(/\s+/g, " ").trim();
      if (!clean) continue;
      const linksOut = lineLinks.map((l) => ({ label: l.label.trim(), url: l.url })).filter((l) => l.label);
      const indent = Math.min(...row.map((i) => i.x)) - margin;
      const previous = lines[lines.length - 1];
      if (BULLET.test(clean)) {
        lines.push({ kind: "bullet", text: clean.replace(BULLET, ""), links: linksOut });
        bulletOpen = true;
      } else if (bulletOpen && indent > 10 && previous?.kind === "bullet") {
        // The wrapped rest of the bullet above: it starts where the bullet's text starts, not at the margin.
        previous.text = `${previous.text} ${clean}`;
        previous.links.push(...linksOut);
      } else {
        lines.push({ kind: "line", text: clean, links: linksOut });
        bulletOpen = false;
      }
    }
  }
  await task.destroy();
  return lines;
}
