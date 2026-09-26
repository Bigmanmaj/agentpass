// OWNER: P1. Runs in mock mode (no SUPABASE_URL in tests); row mappers cover the Supabase shape.
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_MANDATE, getMandate, logDecision, markOrdered, spentThisWeek, toDecisionRow, toMandate } from "./db";

const cart = { items: [], total: 0 };
const log = (mandateId: string, total: number) =>
  logDecision({ mandateId, cart, total, decision: "APPROVE", reasons: ["Within all limits"] });

afterEach(() => vi.useRealTimers());

describe("db (mock mode)", () => {
  it("returns the demo mandate", async () => {
    expect(await getMandate("demo")).toEqual(DEMO_MANDATE);
  });

  it("counts only ordered decisions of this mandate from the last 7 days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00Z"));
    await markOrdered(await log("week-test", 100), "old-order"); // 16 days ago → ignored

    vi.setSystemTime(new Date("2026-09-26T12:00:00Z"));
    await markOrdered(await log("week-test", 160), "o1"); // counted
    await log("week-test", 240); // gate decision but never ordered → ignored
    await markOrdered(await log("other-mandate", 50), "o2"); // other mandate → ignored

    expect(await spentThisWeek("week-test")).toBe(160);
  });

  it("markOrdered works once per decision (a receipt can't be replayed)", async () => {
    const id = await log("replay-test", 160);
    expect(await markOrdered(id, "o1")).toBe(true);
    expect(await markOrdered(id, "o2")).toBe(false);
    expect(await spentThisWeek("replay-test")).toBe(160);
  });

  it("markOrdered returns false for an unknown decision", async () => {
    expect(await markOrdered("does-not-exist", "o1")).toBe(false);
  });
});

describe("Supabase row mappers", () => {
  it("maps a mandates row (numeric may arrive as strings)", () => {
    expect(
      toMandate({
        id: "demo", owner: "Sara — Hackney Vintage", weekly_budget: "500", per_order_cap: 300, ask_above: "200",
        allowed_categories: ["denim", "outerwear"], allowed_vendors: null, max_qty_per_item: 10,
        expires_at: "2026-12-31T23:59:59+00:00",
      }),
    ).toEqual({ ...DEMO_MANDATE, expiresAt: "2026-12-31T23:59:59+00:00" });
  });

  it("maps a decisions row", () => {
    expect(
      toDecisionRow({
        id: "d1", mandate_id: "demo", cart, total: "160", decision: "APPROVE", reasons: ["ok"],
        order_id: null, created_at: "2026-09-26T10:00:00+00:00",
      }),
    ).toEqual({
      id: "d1", mandateId: "demo", cart, total: 160, decision: "APPROVE", reasons: ["ok"],
      orderId: undefined, createdAt: "2026-09-26T10:00:00+00:00",
    });
  });
});
