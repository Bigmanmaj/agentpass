"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMotionAllowed } from "@/components/use-motion-allowed";

export function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  const allowed = useMotionAllowed();
  return (
    <motion.div
      className={className}
      initial={allowed ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: allowed ? 0.45 : 0, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
