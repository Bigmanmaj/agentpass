// OWNER: P1. Add one test per rule in docs/06-build-plan.md.
import { describe, expect, it } from "vitest";
import { evaluateCart } from "./evaluate";
import { DEMO_MANDATE } from "@/lib/db";
import type { Cart } from "@/lib/types";

const ctx = { spentThisWeek: 0, livePrices: { v1: 40, v2: 25 }, now: new Date("2026-09-26") };
const jackets = (qty: number): Cart => ({
  items: [{ variantId: "v1", title: "Jacket", category: "denim", vendor: "Hackney Wholesale", unitPrice: 40, quantity: qty }],
  total: 40 * qty,
});

describe("gate", () => {
  it("approves a small order (scenario 1)", () => {
    expect(evaluateCart(DEMO_MANDATE, jackets(4), ctx).decision).toBe("APPROVE");
  });
  it("asks the human above the threshold (scenario 2)", () => {
    expect(evaluateCart(DEMO_MANDATE, jackets(6), ctx).decision).toBe("ASK_HUMAN");
  });
  it("blocks the injected 25-unit cart (scenario 3)", () => {
    const cart: Cart = {
      items: [{ variantId: "v2", title: "501", category: "denim", vendor: "Brick Lane Bales", unitPrice: 1, quantity: 25 }],
      total: 25,
    };
    expect(evaluateCart(DEMO_MANDATE, cart, ctx).decision).toBe("BLOCK");
  });
});
