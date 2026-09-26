# 09 — "Why the Gate can't be fooled" (P1 pitch section)

OWNER: P1. About 45 seconds, spoken right after scenario 3 (the injection gets blocked). Plugs into the demo in `07-pitch.md`.

## Script

> "You just saw the agent fall for a hidden instruction on a product page. That's expected. Every AI model can be talked into things.
>
> So we don't ask the AI to be safe. Every cart it proposes goes through the **Gate**: plain code with no AI in it. You can't prompt-inject an if-statement.
>
> The Gate doesn't trust anything the agent says. It **re-fetches every price from Shopify** and recomputes the total itself. It checks Sara's rules: categories, vendors, quantity, per-order cap, weekly budget. Break one and the order is blocked, with the reason in plain English.
>
> If the Gate says yes, it issues a **signed receipt** tied to that exact cart, valid for 15 minutes and **usable once**. Shopify only creates the order with that receipt. Change one item, or replay it, and it's rejected.
>
> Every decision is logged, so Sara and the merchant can see exactly what the agent tried and why it was stopped."

Then open `/decisions` for 5 seconds to show the log.

## Proof points (if a judge asks)

| Question | Answer | Backed by |
|---|---|---|
| What if the agent lies about prices? | The Gate ignores agent prices and totals. Any mismatch with Shopify is a block. | `evaluate.test.ts`: price mismatch, "uses live prices, not the agent's total" |
| What about a negative quantity to lower the total? | Blocked. Quantities must be whole numbers of 1 or more. | `evaluate.test.ts`: rule 4 |
| Can I reuse a receipt? | No. Each receipt is linked to one decision and can place one order. | `db.test.ts`: markOrdered works once |
| Can I edit the cart after approval? | No. The receipt is signed over the exact items and quantities. | `receipt.ts`: `cartHash` |
| Can I forge a receipt? | Not without the server secret. In production the app refuses to run with the public default. | `receipt.test.ts`: production secret guard |
| Can someone read your database? | The public key can't. Row level security is on, and only the server holds the secret key. | `supabase/schema.sql` |
| How many tests? | 34, all passing. The Gate itself is a pure function, so every rule is unit-tested. | `npm run check` |

## One line to remember

**"The AI can be fooled. The rules can't: they're code, not prompts."** (same line as in `07-pitch.md`)
