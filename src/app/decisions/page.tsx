// OWNER: P1. Decision history — plain cards, three counts, newest first.
import Link from "next/link";
import { connection } from "next/server";
import { cartSummary, gbp, reasonSentence, timeAgo } from "@/components/format";
import { VerdictBadge } from "@/components/verdict";
import { listDecisions } from "@/lib/db";

export const metadata = { title: "History" };

export default async function DecisionsPage() {
  await connection();
  const rows = await listDecisions();
  const counts = {
    APPROVE: rows.filter((row) => row.decision === "APPROVE").length,
    ASK_HUMAN: rows.filter((row) => row.decision === "ASK_HUMAN").length,
    BLOCK: rows.filter((row) => row.decision === "BLOCK").length,
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-16 sm:px-6 sm:py-10">
      <h1 className="text-[clamp(2rem,6vw,3rem)]">History</h1>
      <p className="muted mt-2">Every cart AgentPass has checked, newest first.</p>

      <ul className="mt-6 grid grid-cols-3 gap-2" aria-label="Counts">
        <li className="glass rounded-2xl p-3 text-center sm:p-4">
          <p className="num text-2xl sm:text-3xl">{counts.APPROVE}</p>
          <p className="muted mt-1 text-xs sm:text-sm">Approved</p>
        </li>
        <li className="glass rounded-2xl p-3 text-center sm:p-4">
          <p className="num text-2xl sm:text-3xl">{counts.ASK_HUMAN}</p>
          <p className="muted mt-1 text-xs sm:text-sm">Needs your OK</p>
        </li>
        <li className="glass rounded-2xl p-3 text-center sm:p-4">
          <p className="num text-2xl sm:text-3xl">{counts.BLOCK}</p>
          <p className="muted mt-1 text-xs sm:text-sm">Stopped</p>
        </li>
      </ul>

      {rows.length === 0 ? (
        <div className="glass mt-6 rounded-3xl p-6">
          <p>No decisions yet.</p>
          <Link href="/checkout" className="btn btn-accent mt-4">
            Try it
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/receipt/${row.id}`} className="glass block rounded-3xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <VerdictBadge decision={row.decision} />
                  <span className="num muted ml-auto text-sm">{timeAgo(row.createdAt)}</span>
                </div>
                <p className="mt-3 leading-snug">{cartSummary(row.cart.items)}</p>
                <p className="num mt-2">{gbp(row.total)}</p>
                <p className="muted mt-2 text-sm leading-relaxed">{reasonSentence(row.reasons)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
