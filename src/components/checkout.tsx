"use client";

// OWNER: P3. Chat, then six plain checks ticking one by one.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FadeIn } from "@/components/fade-in";
import { gbp } from "@/components/format";
import { buildChecks, CHECK_LABELS, type CheckStatus, type GateCheck } from "@/components/gate-checks";
import { MandatePanel } from "@/components/mandate-panel";
import { SCENARIOS } from "@/components/scenarios";
import { useMotionAllowed } from "@/components/use-motion-allowed";
import { VERDICT, VerdictBadge } from "@/components/verdict";
import type { AgentResponse, ApproveResponse, Cart, GateResponse, Mandate, OrderResponse } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const TICK_MS = 280;

type ChatMessage = { id: string; role: "user" | "agent" | "note"; text: string };

async function post<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("The request did not reach the server.");
  }
  const data = (await response.json().catch(() => null)) as (T & { error?: string; reply?: string }) | null;
  if (!response.ok && !(data && typeof data === "object" && "reply" in data)) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  if (!data) throw new Error("Empty response from the server.");
  return data;
}

export function Checkout({ mandate, spent }: { mandate: Mandate; spent: number }) {
  const params = useSearchParams();
  const allowed = useMotionAllowed();
  const prompt = params.get("prompt");
  const [message, setMessage] = useState(prompt || "Restock 4 denim jackets");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [gate, setGate] = useState<GateResponse | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [tick, setTick] = useState({ id: "", n: 0 });
  const threadRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLElement>(null);
  const [seenPrompt, setSeenPrompt] = useState(prompt);
  if (prompt !== seenPrompt) {
    setSeenPrompt(prompt);
    if (prompt) setMessage(prompt);
  }

  const checks = useMemo(() => (gate ? buildChecks(gate.decision, gate.reasons) : null), [gate]);
  const count = checks?.length ?? 0;
  const revealed = gate && tick.id === gate.decisionId ? tick.n : 0;
  const shown = checks && !allowed ? count : revealed;
  const done = Boolean(checks && shown >= count);

  useEffect(() => {
    if (!count || !allowed || !gate) return;
    let shownCount = 0;
    const id = gate.decisionId;
    const step = () => {
      shownCount += 1;
      setTick({ id, n: shownCount });
      if (shownCount >= count) window.clearInterval(timer);
    };
    const timer = window.setInterval(step, TICK_MS);
    const kick = window.setTimeout(step, 40);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(timer);
    };
  }, [gate, allowed, count]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: allowed ? "smooth" : "auto" });
  }, [messages, allowed]);

  useEffect(() => {
    if (!gate || !window.matchMedia("(max-width: 1023px)").matches) return;
    gateRef.current?.scrollIntoView({ behavior: allowed ? "smooth" : "auto", block: "start" });
  }, [gate?.decisionId, allowed, gate]);

  function say(role: ChatMessage["role"], text: string) {
    setMessages((current) => [...current, { id: crypto.randomUUID(), role, text }]);
  }

  async function place(nextCart: Cart, receipt: string) {
    const placed = await post<OrderResponse>("/api/order", { cart: nextCart, receipt });
    setOrder(placed);
    return placed;
  }

  async function run(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || answering) return;
    setMessage(trimmed);
    setBusy(true);
    setError(null);
    setCart(null);
    setGate(null);
    setOrder(null);
    setPendingToken(null);
    setNote(null);
    say("user", trimmed);
    try {
      const agent = await post<AgentResponse>("/api/agent", { message: trimmed, mandateId: mandate.id });
      say("agent", agent.reply);
      if (!agent.cart) return;
      setCart(agent.cart);
      const verdict = await post<GateResponse>("/api/gate", { cart: agent.cart, mandateId: mandate.id });
      setGate(verdict);
      if (verdict.approvalToken) setPendingToken(verdict.approvalToken);
      if (verdict.receipt) await place(agent.cart, verdict.receipt);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(approved: boolean) {
    if (!pendingToken || !cart || answering) return;
    setAnswering(true);
    setError(null);
    try {
      const result = await post<ApproveResponse>("/api/approve", { approvalToken: pendingToken, approved });
      setPendingToken(null);
      if (result.receipt) {
        const placed = await place(cart, result.receipt);
        const line = `Sara said yes. Order ${placed.orderName} is ready.`;
        setNote(line);
        say("note", line);
      } else {
        const line = "Sara said no. Nothing was sent to the shop.";
        setNote(line);
        say("note", line);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Approval failed.");
    } finally {
      setAnswering(false);
    }
  }

  return (
    <FadeIn className="space-y-4">
      <MandatePanel key={`${mandate.weeklyBudget}-${mandate.perOrderCap}-${mandate.askAbove}`} mandate={mandate} spent={spent} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="glass rounded-3xl p-4 sm:p-5" aria-labelledby="chat-title">
          <h2 id="chat-title" className="text-2xl">
            Ask the agent
          </h2>
          <div ref={threadRef} className="mt-4 flex max-h-[22rem] min-h-28 flex-col gap-2 overflow-y-auto pr-1" aria-live="polite">
            {messages.length === 0 && <p className="muted text-sm">Pick a ready-made request, or write your own.</p>}
            {messages.map((entry) => (
              <div
                key={entry.id}
                className={
                  entry.role === "user" ? "bubble bubble-user" : entry.role === "agent" ? "bubble bubble-agent glass" : "muted px-1 text-sm"
                }
              >
                <p>{entry.text}</p>
              </div>
            ))}
          </div>
          {error && (
            <p className="mt-3 text-sm" role="alert">
              {error}
            </p>
          )}
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void run(message);
            }}
          >
            <label className="sr-only" htmlFor="order">
              What should the agent buy?
            </label>
            <input
              id="order"
              className="field"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={busy || answering}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-accent shrink-0" disabled={busy || answering || !message.trim()}>
              {busy ? "Checking…" : "Send"}
            </button>
          </form>
          <ul className="mt-3 flex flex-col gap-2">
            {SCENARIOS.map((scenario) => (
              <li key={scenario.prompt}>
                <button
                  type="button"
                  className="btn btn-ghost w-full justify-start text-left"
                  disabled={busy || answering}
                  onClick={() => void run(scenario.prompt)}
                >
                  <span>
                    <span className="block">{scenario.prompt}</span>
                    <span className="muted text-sm font-normal">{scenario.note}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section ref={gateRef} className="glass scroll-mt-40 rounded-3xl p-4 sm:p-5" aria-labelledby="gate-title">
          <h2 id="gate-title" className="text-2xl">
            AgentPass checks
          </h2>
          {busy && <p className="muted mt-2 text-sm">Checking this cart…</p>}

          {cart && (
            <ul className="mt-4 border-y border-[var(--line)] py-3 text-sm">
              {cart.items.map((item) => (
                <li key={`${item.variantId}-${item.quantity}`} className="flex justify-between gap-3 py-1">
                  <span>
                    {item.quantity} × {item.title}
                  </span>
                  <span className="num">{gbp(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
              {gate && (
                <li className="flex justify-between gap-3 pt-2 font-medium">
                  <span>Total</span>
                  <span className="num">{gbp(gate.checkedTotal)}</span>
                </li>
              )}
            </ul>
          )}

          <ol className="mt-4 space-y-2.5" aria-label="AgentPass checks">
            {(checks ?? CHECK_LABELS.map((label) => ({ ...label, status: "pass" as const, detail: [] as string[] }))).map(
              (check, index) => {
                const visual: CheckStatus = checks && index < shown ? check.status : "wait";
                return <CheckRow key={check.id} check={check} visual={visual} allowed={allowed} />;
              },
            )}
          </ol>

          {gate && (
            <div className={done ? "mt-5" : "sr-only"} aria-live="polite">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--glass-strong)] p-4">
                <VerdictBadge decision={gate.decision} />
                <p className="mt-3 text-lg font-medium">{VERDICT[gate.decision].label}</p>
                <p className="muted mt-1 text-sm leading-relaxed">{gate.reasons.join(". ")}</p>
                {done && gate.decision === "APPROVE" && !order && !error && <p className="muted mt-3 text-sm">Sending to the shop…</p>}
                {order && (
                  <p className="mt-3 text-sm">
                    Order {order.orderName} is ready.{" "}
                    <Link className="quiet-link" href={`/receipt/${gate.decisionId}`}>
                      Open the slip
                    </Link>
                  </p>
                )}
                {note && <p className="mt-3 text-sm">{note}</p>}
                {done && pendingToken && (
                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <p className="font-medium">Sara needs to say yes</p>
                    <p className="muted mt-1 text-sm">This is above the ask-first line. Nothing is ordered until she answers.</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button type="button" className="btn btn-accent flex-1" disabled={answering} onClick={() => void answer(true)}>
                        Yes, place the order
                      </button>
                      <button type="button" className="btn btn-ghost flex-1" disabled={answering} onClick={() => void answer(false)}>
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </FadeIn>
  );
}

function CheckRow({
  check,
  visual,
  allowed,
}: {
  check: GateCheck | { id: string; label: string; status: CheckStatus; detail: string[] };
  visual: CheckStatus;
  allowed: boolean;
}) {
  const spoken = visual === "wait" ? "waiting" : visual === "pass" ? "passed" : `failed. ${check.detail.join(". ")}`;
  return (
    <li className="flex items-start gap-3" aria-label={`${check.label}: ${spoken}`}>
      <span className="check-mark mt-0.5" data-status={visual} aria-hidden>
        <Mark status={visual} allowed={allowed} />
      </span>
      <div className="min-w-0">
        <p className={visual === "wait" ? "muted" : ""}>{check.label}</p>
        {visual === "fail" && check.detail.length > 0 && (
          <p className="muted mt-1 text-sm leading-relaxed">{check.detail.join(". ")}</p>
        )}
      </div>
    </li>
  );
}

function Mark({ status, allowed }: { status: CheckStatus; allowed: boolean }) {
  if (status === "pass") {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
        <motion.path
          d="M3.5 8.2 6.4 11.1 12.5 4.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={allowed ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: allowed ? 0.28 : 0, ease: EASE }}
        />
      </svg>
    );
  }
  if (status === "fail") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path d="M3 3l6 6M9 3 3 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}
