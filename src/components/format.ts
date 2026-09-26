import type { Mandate } from "@/lib/types";

export function gbp(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatWhen(iso);
}

export function mandateSentence(mandate: Mandate) {
  const first = mandate.owner.split("—")[0]?.trim() || mandate.owner;
  const cats = mandate.allowedCategories.join(" and ");
  return `${first} lets the agent spend up to ${gbp(mandate.weeklyBudget)} a week, ${gbp(mandate.perOrderCap)} per order, and asks her first above ${gbp(mandate.askAbove)}. Only ${cats}.`;
}

export function cartSummary(items: { quantity: number; title: string }[]) {
  if (!items.length) return "Empty cart";
  return items.map((item) => `${item.quantity}× ${item.title}`).join(", ");
}

export function reasonSentence(reasons: string[]) {
  if (!reasons.length) return "No reason given.";
  if (reasons.length === 1) return reasons[0];
  return reasons.join(". ");
}
