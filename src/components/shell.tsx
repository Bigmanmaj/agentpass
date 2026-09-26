"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { useMotionAllowed } from "@/components/use-motion-allowed";

const BLOBS = [
  { id: "a", className: "blob blob-a", duration: 36, x: [0, 28, -14, 0], y: [0, 18, -12, 0] },
  { id: "b", className: "blob blob-b", duration: 42, x: [0, -22, 16, 0], y: [0, -16, 10, 0] },
];

const LINKS = [
  { href: "/", label: "Home", active: (path: string) => path === "/" },
  { href: "/checkout", label: "Try it", active: (path: string) => path.startsWith("/checkout") },
  {
    href: "/decisions",
    label: "History",
    active: (path: string) => path.startsWith("/decisions") || path.startsWith("/receipt"),
  },
];

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("agentpass-theme", next);
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const allowed = useMotionAllowed();

  return (
    <MotionConfig reducedMotion="user">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {BLOBS.map((blob) => (
          <motion.div
            key={blob.id}
            className={blob.className}
            initial={false}
            animate={allowed ? { x: blob.x, y: blob.y } : { x: 0, y: 0 }}
            transition={allowed ? { duration: blob.duration, repeat: Infinity, ease: [0.45, 0, 0.55, 1] } : { duration: 0 }}
          />
        ))}
      </div>
      <div className="relative z-10 flex min-h-dvh flex-col">
        <a className="skip" href="#content">
          Skip to content
        </a>
        <header className="topbar sticky top-0 z-30 px-3 py-3 sm:px-5">
          <div className="glass mx-auto grid max-w-3xl grid-cols-[1fr_auto] items-center gap-2 rounded-3xl px-3 py-2 sm:grid-cols-[auto_1fr_auto] sm:px-4">
            <Link href="/" className="flex min-h-11 items-center gap-2 pr-2 sm:col-start-1">
              <Mark />
              <span className="font-display text-lg tracking-tight">AgentPass</span>
            </Link>
            <div className="justify-self-end sm:col-start-3 sm:row-start-1">
              <button type="button" className="theme-btn" aria-label="Toggle colour theme" onClick={toggleTheme}>
                <Sun />
                <Moon />
              </button>
            </div>
            <nav
              aria-label="Pages"
              className="col-span-2 flex gap-1 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-self-end"
            >
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="nav-link" data-active={link.active(path)}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <div id="content" className="flex-1">
          {children}
        </div>
      </div>
    </MotionConfig>
  );
}

function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="9" fill="var(--accent)" />
      <path d="M9 8.5v11M19 8.5v11M8 11.5h12" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Sun() {
  return (
    <svg className="icon-sun" width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 1.8v1.8M9 14.4v1.8M1.8 9h1.8M14.4 9h1.8M3.6 3.6l1.3 1.3M13.1 13.1l1.3 1.3M14.4 3.6l-1.3 1.3M4.9 13.1l-1.3 1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Moon() {
  return (
    <svg className="icon-moon" width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M14.2 11.2A5.6 5.6 0 0 1 6.8 3.5 5.8 5.8 0 1 0 14.2 11.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
