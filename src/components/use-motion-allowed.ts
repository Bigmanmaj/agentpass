"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Server and the hydration render stay still. After that, motion runs only
// when the visitor has not asked for reduced motion.
export function useMotionAllowed() {
  const reduce = useSyncExternalStore(subscribe, prefersReducedMotion, () => true);
  return !reduce;
}
