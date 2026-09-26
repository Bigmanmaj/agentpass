import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <div className="glass rounded-3xl p-6 sm:p-8">
        <h1 className="text-3xl">That slip isn’t here</h1>
        <p className="muted mt-3">It may belong to another session, or the cart never reached AgentPass.</p>
        <Link href="/decisions" className="btn btn-accent mt-5">
          Back to history
        </Link>
      </div>
    </main>
  );
}
