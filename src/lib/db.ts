// OWNER: P1. Mandates + decision log. In-memory mock until SUPABASE_URL is set.
// Real tables: supabase/schema.sql
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Cart, Decision, Mandate } from "@/lib/types";
import { env, mocks } from "@/lib/env";

export const DEMO_MANDATE: Mandate = {
  id: "demo",
  owner: "Sara — Hackney Vintage",
  weeklyBudget: 500,
  perOrderCap: 300,
  askAbove: 200,
  allowedCategories: ["denim", "outerwear"],
  allowedVendors: null,
  maxQtyPerItem: 10,
  expiresAt: "2026-12-31T23:59:59Z",
};

type DecisionRow = { id: string; mandateId: string; cart: Cart; total: number; decision: Decision; reasons: string[]; orderId?: string; createdAt: string };
const memory: DecisionRow[] = [];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const weekAgo = () => new Date(Date.now() - WEEK_MS).toISOString(); // rolling 7 days

// Server-side only: the service role key bypasses RLS. Never import this from a client component.
let client: SupabaseClient | null = null;
const sb = () => (client ??= createClient(env.supabaseUrl, env.supabaseKey, { auth: { persistSession: false } }));

// Supabase rows are snake_case; numeric columns can arrive as strings.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const toMandate = (r: any): Mandate => ({
  id: r.id,
  owner: r.owner,
  weeklyBudget: Number(r.weekly_budget),
  perOrderCap: Number(r.per_order_cap),
  askAbove: Number(r.ask_above),
  allowedCategories: r.allowed_categories,
  allowedVendors: r.allowed_vendors ?? null,
  maxQtyPerItem: Number(r.max_qty_per_item),
  expiresAt: r.expires_at,
});

export const toDecisionRow = (r: any): DecisionRow => ({
  id: r.id,
  mandateId: r.mandate_id,
  cart: r.cart,
  total: Number(r.total),
  decision: r.decision,
  reasons: r.reasons,
  orderId: r.order_id ?? undefined,
  createdAt: r.created_at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getMandate(id: string): Promise<Mandate> {
  if (mocks.db) return DEMO_MANDATE;
  const { data, error } = await sb().from("mandates").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase getMandate: ${error.message}`);
  if (!data) throw new Error(`Mandate ${id} not found`);
  return toMandate(data);
}

export async function spentThisWeek(mandateId: string): Promise<number> {
  if (mocks.db)
    return memory
      .filter((d) => d.mandateId === mandateId && d.orderId && d.createdAt >= weekAgo())
      .reduce((s, d) => s + d.total, 0);
  const { data, error } = await sb()
    .from("decisions")
    .select("total")
    .eq("mandate_id", mandateId)
    .not("order_id", "is", null)
    .gte("created_at", weekAgo());
  if (error) throw new Error(`Supabase spentThisWeek: ${error.message}`);
  return data.reduce((s, d) => s + Number(d.total), 0);
}

export async function logDecision(row: Omit<DecisionRow, "id" | "createdAt">): Promise<string> {
  const id = crypto.randomUUID();
  if (mocks.db) {
    memory.push({ ...row, id, createdAt: new Date().toISOString() });
    return id;
  }
  const { error } = await sb().from("decisions").insert({
    id,
    mandate_id: row.mandateId,
    cart: row.cart,
    total: row.total,
    decision: row.decision,
    reasons: row.reasons,
    order_id: row.orderId ?? null,
  });
  if (error) throw new Error(`Supabase logDecision: ${error.message}`);
  return id;
}

// Links a decision to the order it produced. Succeeds only once per decision,
// so the same receipt can't place a second order. Returns false if already used or unknown.
export async function markOrdered(decisionId: string, orderId: string): Promise<boolean> {
  if (mocks.db) {
    const d = memory.find((m) => m.id === decisionId);
    if (!d || d.orderId) return false;
    d.orderId = orderId;
    return true;
  }
  const { data, error } = await sb()
    .from("decisions")
    .update({ order_id: orderId })
    .eq("id", decisionId)
    .is("order_id", null)
    .select("id");
  if (error) throw new Error(`Supabase markOrdered: ${error.message}`);
  return data.length === 1;
}

// After the Shopify order exists: swap the "pending" placeholder set by markOrdered for the real id.
// Only touches rows still marked "pending", so it can never overwrite a real order id.
export async function setOrderId(decisionId: string, orderId: string): Promise<boolean> {
  if (mocks.db) {
    const d = memory.find((m) => m.id === decisionId);
    if (!d || d.orderId !== "pending") return false;
    d.orderId = orderId;
    return true;
  }
  const { data, error } = await sb()
    .from("decisions")
    .update({ order_id: orderId })
    .eq("id", decisionId)
    .eq("order_id", "pending")
    .select("id");
  if (error) throw new Error(`Supabase setOrderId: ${error.message}`);
  return data.length === 1;
}

export async function listDecisions(): Promise<DecisionRow[]> {
  if (mocks.db) return [...memory].reverse();
  const { data, error } = await sb().from("decisions").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Supabase listDecisions: ${error.message}`);
  return data.map(toDecisionRow);
}
