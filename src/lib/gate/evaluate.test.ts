// OWNER: P1. Add one test per rule in docs/06-build-plan.md.
import { describe, expect, it } from "vitest";
import { evaluateCart } from "./evaluate";
import { DEMO_MANDATE } from "@/lib/db";
import type { Cart, CartItem } from "@/lib/types";

const ctx = { spentThisWeek: 0, livePrices: { v1: 40, v2: 25 }, now: new Date("2026-09-26") };
const jacket = (qty: number, overrides: Partial<CartItem> = {}): CartItem => ({
  variantId: "v1", title: "Jacket", category: "denim", vendor: "Hackney Wholesale", unitPrice: 40, quantity: qty, ...overrides,
});
const cartOf = (...items: CartItem[]): Cart => ({ items, total: items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) });
const jackets = (qty: number): Cart => cartOf(jacket(qty));

describe("gate — demo scenarios", () => {
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

describe("gate — one test per rule", () => {
  const blockedFor = (cart: Cart, pattern: RegExp, mandate = DEMO_MANDATE, c = ctx) => {
    const r = evaluateCart(mandate, cart, c);
    expect(r.decision).toBe("BLOCK");
    expect(r.reasons.join(" | ")).toMatch(pattern);
  };

  it("1. blocks when the mandate has expired", () => {
    blockedFor(jackets(1), /expired/i, { ...DEMO_MANDATE, expiresAt: "2026-09-01T00:00:00Z" });
  });
  it("2. blocks a category outside the mandate", () => {
    blockedFor(cartOf(jacket(1, { category: "electronics" })), /category/i);
  });
  it("2. category check ignores case", () => {
    expect(evaluateCart(DEMO_MANDATE, cartOf(jacket(1, { category: "Denim" })), ctx).decision).toBe("APPROVE");
  });
  it("3. blocks a vendor not on the allow-list", () => {
    blockedFor(jackets(1), /vendor/i, { ...DEMO_MANDATE, allowedVendors: ["Brick Lane Bales"] });
  });
  it("3. any vendor is fine when allowedVendors is null", () => {
    expect(evaluateCart(DEMO_MANDATE, jackets(1), ctx).decision).toBe("APPROVE");
  });
  it("4. blocks more than maxQtyPerItem of one item", () => {
    blockedFor(jackets(11), /quantity/i, { ...DEMO_MANDATE, perOrderCap: 10_000, askAbove: 10_000, weeklyBudget: 10_000 });
  });
  it("4. blocks zero, negative or fractional quantities (can't lower the total)", () => {
    for (const q of [0, -5, 1.5]) blockedFor(cartOf(jacket(6), jacket(q)), /quantity/i);
  });
  it("5. blocks a total above the per-order cap", () => {
    blockedFor(jackets(8), /per-order cap/i, { ...DEMO_MANDATE, askAbove: 10_000 });
  });
  it("6. blocks when this week's spend + total exceeds the weekly budget", () => {
    blockedFor(jackets(4), /weekly budget/i, DEMO_MANDATE, { ...ctx, spentThisWeek: 400 });
  });
  it("6. allows spending exactly up to the weekly budget", () => {
    expect(evaluateCart(DEMO_MANDATE, jackets(4), { ...ctx, spentThisWeek: 340 }).decision).toBe("APPROVE");
  });
  it("7. blocks when the agent's unit price differs from the live price", () => {
    blockedFor(cartOf(jacket(4, { unitPrice: 30 })), /price mismatch/i);
  });
  it("7. blocks a product with no live price", () => {
    blockedFor(cartOf(jacket(1, { variantId: "ghost" })), /unknown product/i);
  });
  it("uses live prices, not the agent's total", () => {
    const r = evaluateCart(DEMO_MANDATE, { ...jackets(4), total: 1 }, ctx);
    expect(r.checkedTotal).toBe(160);
  });
  it("blocks an empty cart", () => {
    blockedFor({ items: [], total: 0 }, /empty/i);
  });
  it("8/9. exactly askAbove is still APPROVE, just above is ASK_HUMAN", () => {
    const m = { ...DEMO_MANDATE, askAbove: 160 };
    expect(evaluateCart(m, jackets(4), ctx).decision).toBe("APPROVE");
    expect(evaluateCart(m, jackets(5), ctx).decision).toBe("ASK_HUMAN");
  });
});
