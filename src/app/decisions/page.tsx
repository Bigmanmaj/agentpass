// OWNER: P1. Decision log: every Gate verdict, newest first. Server component — reads the DB directly.
import { connection } from "next/server";
import { listDecisions } from "@/lib/db";
import type { Decision } from "@/lib/types";

const badge: Record<Decision, string> = {
  APPROVE: "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
  ASK_HUMAN: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  BLOCK: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
};
const label: Record<Decision, string> = { APPROVE: "Approved", ASK_HUMAN: "Asked human", BLOCK: "Blocked" };

export default async function DecisionsPage() {
  await connection(); // render per request, never a build-time snapshot
  const rows = await listDecisions();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Gate decisions</h1>
      <p className="mt-1 text-sm opacity-70">
        Every cart the agent proposed, and what the Gate decided. Totals are recomputed from live prices.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 opacity-70">No decisions yet. Run a scenario on the home page.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((d) => (
            <li key={d.id} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`rounded px-2 py-0.5 text-sm font-medium ${badge[d.decision]}`}>{label[d.decision]}</span>
                <span className="font-mono">£{d.total.toFixed(2)}</span>
                <span className="text-sm opacity-70">
                  {d.cart.items.map((i) => `${i.quantity}× ${i.title}`).join(", ") || "Empty cart"}
                </span>
                <time className="ml-auto text-xs opacity-60" dateTime={d.createdAt}>
                  {new Date(d.createdAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}
                </time>
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {d.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              {d.orderId && <p className="mt-2 font-mono text-xs opacity-70">Shopify order: {d.orderId}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
