import type { Decision } from "@/lib/types";

export type CheckStatus = "pass" | "fail" | "wait";

export type GateCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string[];
};

const RULES: { id: string; label: string; test: RegExp }[] = [
  { id: "permission", label: "Permission active", test: /empty cart|mandate expired/i },
  { id: "items", label: "Allowed items", test: /category "|vendor "/i },
  { id: "quantity", label: "Sensible quantity", test: /invalid quantity|quantity [\d.]+ is above/i },
  { id: "price", label: "Real price", test: /price mismatch|unknown product/i },
  { id: "cap", label: "Order limit", test: /per-order cap/i },
  { id: "week", label: "Weekly budget", test: /weekly budget/i },
];

export const CHECK_LABELS = RULES.map((rule) => ({ id: rule.id, label: rule.label }));

// Maps the Gate's own reasons onto six plain checks. Does not decide anything.
export function buildChecks(_decision: Decision, reasons: string[]): GateCheck[] {
  const used = new Set<string>();
  const take = (test: RegExp) => {
    const hits = reasons.filter((reason) => test.test(reason));
    hits.forEach((hit) => used.add(hit));
    return hits;
  };

  const checks = RULES.map((rule) => {
    const detail = take(rule.test);
    return { id: rule.id, label: rule.label, status: (detail.length ? "fail" : "pass") as CheckStatus, detail };
  });

  const leftover = reasons.filter((reason) => !used.has(reason) && !/above £|above \$/i.test(reason));
  if (leftover.length) {
    const first = checks[0];
    first.detail = [...first.detail, ...leftover];
    first.status = "fail";
  }

  return checks;
}
