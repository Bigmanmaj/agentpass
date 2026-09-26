// OWNER: P1 (Gate & Trust). Pure function — no network, no LLM, fully unit-testable.
// Rules and order: docs/06-build-plan.md. First BLOCK wins.
import type { Cart, GateContext, GateResult, Mandate } from "@/lib/types";

export function evaluateCart(mandate: Mandate, cart: Cart, ctx: GateContext): GateResult {
  const reasons: string[] = [];

  // Never trust agent prices: recompute from live prices.
  let checkedTotal = 0;
  for (const item of cart.items) {
    const live = ctx.livePrices[item.variantId];
    if (live === undefined) reasons.push(`Unknown product ${item.title}`);
    else checkedTotal += live * item.quantity;
  }

  if (new Date(mandate.expiresAt) < ctx.now) reasons.push("Mandate expired");
  // TODO(P1): categories, vendors, qty per item, price mismatch, weekly budget
  if (checkedTotal > mandate.perOrderCap)
    reasons.push(`Total £${checkedTotal} is above the per-order cap £${mandate.perOrderCap}`);

  if (reasons.length) return { decision: "BLOCK", reasons, checkedTotal };
  if (checkedTotal > mandate.askAbove)
    return { decision: "ASK_HUMAN", reasons: [`Total £${checkedTotal} is above £${mandate.askAbove}`], checkedTotal };
  return { decision: "APPROVE", reasons: ["Within all limits"], checkedTotal };
}
