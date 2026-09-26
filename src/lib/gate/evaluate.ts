// OWNER: P1 (Gate & Trust). Pure function — no network, no LLM, fully unit-testable.
// Rules and order: docs/06-build-plan.md. Any BLOCK wins; all block reasons are reported.
import type { Cart, GateContext, GateResult, Mandate } from "@/lib/types";

const money = (n: number) => `£${Math.round(n * 100) / 100}`;

export function evaluateCart(mandate: Mandate, cart: Cart, ctx: GateContext): GateResult {
  const reasons: string[] = [];
  const categories = mandate.allowedCategories.map((c) => c.toLowerCase());
  const vendors = mandate.allowedVendors?.map((v) => v.toLowerCase()) ?? null;

  if (cart.items.length === 0) reasons.push("Empty cart");

  // 1. Mandate expired
  if (new Date(mandate.expiresAt) < ctx.now) reasons.push("Mandate expired");

  // Never trust agent prices or totals: recompute from live prices.
  let checkedTotal = 0;
  for (const item of cart.items) {
    // 2. Category
    if (!categories.includes(item.category.toLowerCase()))
      reasons.push(`${item.title}: category "${item.category}" is not allowed`);
    // 3. Vendor
    if (vendors && !vendors.includes(item.vendor.toLowerCase()))
      reasons.push(`${item.title}: vendor "${item.vendor}" is not allowed`);
    // 4. Quantity — must be a positive whole number, so it can't be used to lower the total
    if (!Number.isInteger(item.quantity) || item.quantity < 1)
      reasons.push(`${item.title}: invalid quantity ${item.quantity}`);
    else if (item.quantity > mandate.maxQtyPerItem)
      reasons.push(`${item.title}: quantity ${item.quantity} is above the max ${mandate.maxQtyPerItem} per item`);
    // 7. Price mismatch
    const live = ctx.livePrices[item.variantId];
    if (live === undefined) {
      reasons.push(`Unknown product ${item.title}`);
      continue;
    }
    if (Math.abs(live - item.unitPrice) > 0.005)
      reasons.push(`${item.title}: price mismatch — agent said ${money(item.unitPrice)}, live price is ${money(live)}`);
    checkedTotal += live * Math.max(item.quantity, 0);
  }
  checkedTotal = Math.round(checkedTotal * 100) / 100;

  // 5. Per-order cap
  if (checkedTotal > mandate.perOrderCap)
    reasons.push(`Total ${money(checkedTotal)} is above the per-order cap ${money(mandate.perOrderCap)}`);
  // 6. Weekly budget
  if (ctx.spentThisWeek + checkedTotal > mandate.weeklyBudget)
    reasons.push(
      `Weekly budget: ${money(ctx.spentThisWeek)} spent + ${money(checkedTotal)} is above ${money(mandate.weeklyBudget)}`,
    );

  if (reasons.length) return { decision: "BLOCK", reasons, checkedTotal };
  // 8. Human approval
  if (checkedTotal > mandate.askAbove)
    return { decision: "ASK_HUMAN", reasons: [`Total ${money(checkedTotal)} is above ${money(mandate.askAbove)}`], checkedTotal };
  // 9. Approve
  return { decision: "APPROVE", reasons: ["Within all limits"], checkedTotal };
}
