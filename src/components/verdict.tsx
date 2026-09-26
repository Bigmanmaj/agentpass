import type { Decision } from "@/lib/types";

export const VERDICT: Record<Decision, { label: string; tone: "approve" | "block" | "ask" }> = {
  APPROVE: { label: "Approved", tone: "approve" },
  ASK_HUMAN: { label: "Needs your OK", tone: "ask" },
  BLOCK: { label: "Stopped", tone: "block" },
};

export function VerdictBadge({ decision }: { decision: Decision }) {
  const verdict = VERDICT[decision];
  return <span className={`badge badge-${verdict.tone}`}>{verdict.label}</span>;
}
