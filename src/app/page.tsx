"use client";
// OWNER: P3. Bare-bones flow so everyone can test end to end. P3 replaces the look.
import { useState } from "react";
import type { AgentResponse, ApproveResponse, GateResponse, OrderResponse } from "@/lib/types";

const post = async <T,>(url: string, body: unknown): Promise<T> =>
  (await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();

export default function Home() {
  const [message, setMessage] = useState("Restock 4 denim jackets");
  const [log, setLog] = useState<string[]>([]);
  const [pending, setPending] = useState<{ token: string; agent: AgentResponse } | null>(null);
  const add = (line: string) => setLog((l) => [...l, line]);

  async function order(agent: AgentResponse, receipt: string) {
    const o = await post<OrderResponse>("/api/order", { cart: agent.cart, receipt });
    add(`🧾 Shopify order ${o.orderName} [${o.tags?.join(", ")}]`);
  }

  async function run() {
    add(`👤 ${message}`);
    const agent = await post<AgentResponse>("/api/agent", { message, mandateId: "demo" });
    add(`🤖 ${agent.reply}`);
    if (!agent.cart) return;
    const gate = await post<GateResponse>("/api/gate", { cart: agent.cart, mandateId: "demo" });
    add(`🛡️ ${gate.decision}: ${gate.reasons.join("; ")} (checked £${gate.checkedTotal})`);
    if (gate.receipt) await order(agent, gate.receipt);
    if (gate.approvalToken) setPending({ token: gate.approvalToken, agent });
  }

  async function answer(approved: boolean) {
    if (!pending) return;
    const r = await post<ApproveResponse>("/api/approve", { approvalToken: pending.token, approved });
    add(`📱 Sara said ${approved ? "YES" : "NO"}`);
    if (r.receipt) await order(pending.agent, r.receipt);
    setPending(null);
  }

  return (
    <main className="mx-auto max-w-xl p-6 font-sans">
      <h1 className="text-2xl font-bold">AgentPass</h1>
      <p className="mb-4 text-sm opacity-70">Mandate: Sara — £500/week, cap £300, ask above £200, denim & outerwear</p>
      <div className="flex gap-2">
        <input className="flex-1 rounded border px-3 py-2" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="rounded bg-black px-4 py-2 text-white" onClick={run}>Send</button>
      </div>
      <div className="mt-2 flex gap-2 text-xs">
        {["Restock 4 denim jackets", "Restock 6 denim jackets", "Restock vintage 501 jeans"].map((s) => (
          <button key={s} className="rounded border px-2 py-1" onClick={() => setMessage(s)}>{s}</button>
        ))}
      </div>
      {pending && (
        <div className="mt-4 rounded border border-green-600 p-3">
          📱 WhatsApp to Sara: approve £{pending.agent.cart?.total}?
          <button className="ml-2 rounded bg-green-600 px-2 text-white" onClick={() => answer(true)}>Yes</button>
          <button className="ml-2 rounded bg-red-600 px-2 text-white" onClick={() => answer(false)}>No</button>
        </div>
      )}
      <ul className="mt-4 space-y-1 text-sm">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </main>
  );
}
