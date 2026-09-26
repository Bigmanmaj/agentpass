"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMotionAllowed } from "@/components/use-motion-allowed";

const STEPS: { id: string; title: string; caption: string; icon: ReactNode }[] = [
  {
    id: "agent",
    title: "Agent",
    caption: "Suggests what to buy",
    icon: <AgentIcon />,
  },
  {
    id: "gate",
    title: "AgentPass checks",
    caption: "Checks the spending rules",
    icon: <GateIcon />,
  },
  {
    id: "shop",
    title: "Shop",
    caption: "Only then can the order go through",
    icon: <BagIcon />,
  },
];

const drift = { duration: 6.5, repeat: Infinity, repeatType: "mirror" as const, ease: [0.45, 0, 0.55, 1] as const };

export function FlowDiagram() {
  const allowed = useMotionAllowed();

  return (
    <div className="relative">
      <motion.span
        aria-hidden
        className="bead bead-y md:hidden"
        initial={false}
        animate={allowed ? { top: ["12%", "50%", "88%"] } : { top: "50%" }}
        transition={allowed ? drift : { duration: 0 }}
      />
      <motion.span
        aria-hidden
        className="bead bead-x hidden md:block"
        initial={false}
        animate={allowed ? { left: ["16%", "50%", "84%"] } : { left: "50%" }}
        transition={allowed ? drift : { duration: 0 }}
      />
      <ol className="flow" aria-label="Agent, then AgentPass checks, then Shop">
        {STEPS.map((step) => (
          <li key={step.id} className="flow-step">
            <div className="flow-icon glass">{step.icon}</div>
            <article className="glass min-w-0 rounded-3xl p-4 text-left sm:p-5 md:text-center">
              <h3 className="text-xl sm:text-2xl">{step.title}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{step.caption}</p>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AgentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M4 4.5h10v7H7.2L4.5 14V4.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function GateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M4.5 3.5v11M13.5 3.5v11M4 6.5h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M5 6.5h8l-.6 8H5.6L5 6.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M7 6.5V5.2A2 2 0 0 1 9 3.2 2 2 0 0 1 11 5.2v1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
