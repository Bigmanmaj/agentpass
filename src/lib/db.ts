// OWNER: P1. Mandates + decision log. In-memory mock until SUPABASE_URL is set.
// Real tables: supabase/schema.sql
import type { Cart, Decision, Mandate } from "@/lib/types";
import { mocks } from "@/lib/env";

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

export async function getMandate(id: string): Promise<Mandate> {
  if (mocks.db) return DEMO_MANDATE;
  throw new Error("TODO(P1): read mandate from Supabase");
}

export async function spentThisWeek(mandateId: string): Promise<number> {
  if (mocks.db) return memory.filter((d) => d.mandateId === mandateId && d.orderId).reduce((s, d) => s + d.total, 0);
  throw new Error("TODO(P1): sum this week's ordered decisions from Supabase");
}

export async function logDecision(row: Omit<DecisionRow, "id" | "createdAt">): Promise<string> {
  const id = crypto.randomUUID();
  if (mocks.db) {
    memory.push({ ...row, id, createdAt: new Date().toISOString() });
    return id;
  }
  throw new Error("TODO(P1): insert decision into Supabase");
}

export async function listDecisions(): Promise<DecisionRow[]> {
  if (mocks.db) return [...memory].reverse();
  throw new Error("TODO(P1): list decisions from Supabase");
}
