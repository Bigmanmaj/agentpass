// OWNER: P3. Home — one idea, one diagram, one button.
import Link from "next/link";
import { connection } from "next/server";
import { FadeIn } from "@/components/fade-in";
import { FlowDiagram } from "@/components/flow-diagram";
import { MandatePanel } from "@/components/mandate-panel";
import { getMandate, spentThisWeek } from "@/lib/db";

export const metadata = { title: "Home" };

export default async function Home() {
  await connection();
  const mandate = await getMandate("demo");
  const spent = await spentThisWeek(mandate.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-16 sm:px-6 sm:py-12">
      <FadeIn>
        <h1 className="max-w-xl text-[clamp(2.2rem,7vw,3.6rem)]">
          Nothing is bought until AgentPass says it is allowed.
        </h1>
        <div className="mt-5">
          <MandatePanel key={`${mandate.weeklyBudget}-${mandate.perOrderCap}-${mandate.askAbove}`} mandate={mandate} spent={spent} />
        </div>
        <div className="mt-6">
          <Link href="/checkout" className="btn btn-accent">
            Try it
          </Link>
        </div>
      </FadeIn>

      <section className="mt-10 sm:mt-12" aria-labelledby="flow-title">
        <h2 id="flow-title" className="sr-only">
          How it works
        </h2>
        <FlowDiagram />
      </section>
    </main>
  );
}
