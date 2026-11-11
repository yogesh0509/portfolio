'use client'

import Link from "next/link";
import { VscAccount, VscMenu, VscSearch, VscTerminal } from "react-icons/vsc";
import { RESUME_URL, useWorkbench } from "./WorkbenchProvider";

/** The top bar on phones, where the activity bar and title bar are hidden. */
export default function MobileBar() {
  const { activeFile, activeUrl, setDrawerOpen, openQuickOpen, togglePanel, profile } = useWorkbench();
  const button = "grid size-10 place-items-center text-xl";
  const onResume = activeUrl === RESUME_URL;
  return (
    <header className="flex h-11 shrink-0 items-center border-b border-line bg-chrome px-1 md:hidden print:hidden">
      <button type="button" className={button} onClick={() => setDrawerOpen(true)} aria-label="Open explorer">
        <VscMenu aria-hidden />
      </button>
      <p className="min-w-0 flex-1 truncate px-1 text-center text-sm">{activeFile?.name ?? (onResume ? "resume" : profile.handle)}</p>
      <button type="button" className={button} onClick={() => openQuickOpen("")} aria-label="Search files">
        <VscSearch aria-hidden />
      </button>
      <Link
        href={RESUME_URL}
        prefetch={false}
        className={`${button} ${onResume ? "border-b-2 border-accent text-white" : ""}`}
        aria-label="Résumé"
        aria-current={onResume ? "page" : undefined}
      >
        <VscAccount aria-hidden />
      </Link>
      <button type="button" className={button} onClick={togglePanel} aria-label="Toggle terminal">
        <VscTerminal aria-hidden />
      </button>
    </header>
  );
}
