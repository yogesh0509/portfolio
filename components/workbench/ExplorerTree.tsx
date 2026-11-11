'use client'

import Link from "next/link";
import { useState } from "react";
import { FaRegFileAlt, FaRegFileVideo } from "react-icons/fa";
import { MdOutlineKeyboardArrowDown, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { SiJavascript, SiJson, SiMarkdown, SiPython, SiRust, SiSolidity, SiTypescript } from "react-icons/si";
import type { LangId } from "@/lib/languages";
import type { ExplorerNode } from "@/lib/vfs/types";
import { useWorkbench } from "./WorkbenchProvider";

const ICONS: Partial<Record<LangId, { Icon: React.ComponentType<{ color?: string; "aria-hidden"?: boolean }>; color: string }>> = {
  markdown: { Icon: SiMarkdown, color: "#519aba" },
  rust: { Icon: SiRust, color: "#dea584" },
  solidity: { Icon: SiSolidity, color: "#a0a0a0" },
  typescript: { Icon: SiTypescript, color: "#3178c6" },
  javascript: { Icon: SiJavascript, color: "#f1e05a" },
  json: { Icon: SiJson, color: "#cbcb41" },
  python: { Icon: SiPython, color: "#3572a5" },
  video: { Icon: FaRegFileVideo, color: "#c586c0" },
};

export function FileIcon({ lang }: { lang?: LangId }) {
  const entry = lang ? ICONS[lang] : undefined;
  if (!entry) return <FaRegFileAlt aria-hidden className="text-[#858585]" />;
  // Decorative: the file name next to it says what the file is.
  return <entry.Icon color={entry.color} aria-hidden />;
}

function containsUrl(node: ExplorerNode, url: string): boolean {
  return node.kind === "file" ? node.url === url : (node.children ?? []).some((c) => containsUrl(c, url));
}

function Node({ node, depth }: { node: ExplorerNode; depth: number }) {
  const { activeUrl, pinTab } = useWorkbench();
  const [open, setOpen] = useState((depth === 0 && node.name !== "archive") || containsUrl(node, activeUrl));
  const indent = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.kind === "dir") {
    return (
      <li>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-1 py-[3px] pr-2 text-left hover:bg-[#2a2d2e]"
          style={indent}
        >
          {open ? <MdOutlineKeyboardArrowDown aria-hidden /> : <MdOutlineKeyboardArrowRight aria-hidden />}
          {node.name}
        </button>
        {open && (
          <ul>
            {node.children?.map((child) => (
              <Node key={child.path} node={child} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const url = node.url ?? node.path;
  const active = url === activeUrl;
  return (
    <li>
      <Link
        href={url}
        prefetch={false}
        aria-current={active ? "page" : undefined}
        onDoubleClick={() => pinTab(url)}
        className={`flex items-center gap-2 py-[3px] pr-2 ${active ? "bg-[#37373d] text-white" : "hover:bg-[#2a2d2e]"}`}
        style={{ paddingLeft: `${depth * 12 + 22}px` }}
      >
        <FileIcon lang={node.lang} />
        <span className="truncate">{node.name}</span>
      </Link>
    </li>
  );
}

export default function ExplorerTree({ tree }: { tree: ExplorerNode[] }) {
  return (
    <ul aria-label="Files">
      {tree.map((node) => (
        <Node key={node.path} node={node} depth={0} />
      ))}
    </ul>
  );
}
