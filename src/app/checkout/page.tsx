// OWNER: P3
import { Suspense } from "react";
import { connection } from "next/server";
import { Checkout } from "@/components/checkout";
import { getMandate, spentThisWeek } from "@/lib/db";

export const metadata = { title: "Try it" };

export default async function CheckoutPage() {
  await connection();
  const mandate = await getMandate("demo");
  const spent = await spentThisWeek(mandate.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-16 sm:px-6 sm:py-10">
      <h1 className="text-[clamp(2rem,6vw,3rem)]">Try a cart</h1>
      <p className="muted mt-2 max-w-xl">
        The agent suggests what to buy. AgentPass checks the rules. You see Approved, Needs your OK, or Stopped — with the reason.
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="muted">Opening…</p>}>
          <Checkout mandate={mandate} spent={spent} />
        </Suspense>
      </div>
    </main>
  );
}
