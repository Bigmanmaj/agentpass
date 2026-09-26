// OWNER: P3. One decision slip — status, items, total, date. No JWT.
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { formatWhen, gbp } from "@/components/format";
import { VerdictBadge } from "@/components/verdict";
import { listDecisions } from "@/lib/db";
import type { Decision } from "@/lib/types";

export const metadata = { title: "Receipt" };

function statusLine(decision: Decision, orderId?: string) {
  if (orderId && orderId !== "pending") return "Order placed, receipt used";
  if (orderId === "pending") return "Order in progress";
  if (decision === "APPROVE") return "Approved, not used yet";
  if (decision === "ASK_HUMAN") return "Needs your OK";
  return "Stopped, no receipt";
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const row = (await listDecisions()).find((decision) => decision.id === id);
  if (!row) notFound();

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6 pb-16 sm:px-6 sm:py-10">
      <h1 className="text-[clamp(2rem,6vw,3rem)]">Receipt</h1>

      <article className="glass mt-6 rounded-3xl p-5 sm:p-6">
        <VerdictBadge decision={row.decision} />
        <p className="mt-4 text-2xl leading-snug sm:text-3xl">{statusLine(row.decision, row.orderId)}</p>

        <ul className="mt-6 space-y-2 border-y border-[var(--line)] py-4 text-sm">
          {row.cart.items.length === 0 && <li>Empty cart</li>}
          {row.cart.items.map((item) => (
            <li key={`${item.variantId}-${item.quantity}`} className="flex justify-between gap-3">
              <span>
                {item.quantity} × {item.title}
              </span>
              <span className="num">{gbp(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-baseline justify-between gap-3">
          <span className="muted">Total</span>
          <span className="num text-xl">{gbp(row.total)}</span>
        </div>
        <p className="muted mt-3 text-sm">{formatWhen(row.createdAt)}</p>
        {row.reasons.length > 0 && <p className="mt-4 text-sm leading-relaxed">{row.reasons.join(". ")}</p>}
      </article>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/decisions" className="btn btn-ghost">
          History
        </Link>
        <Link href="/checkout" className="btn btn-accent">
          Try it
        </Link>
      </div>
    </main>
  );
}
