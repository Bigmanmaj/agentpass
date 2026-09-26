# 02 — The idea

## One line
AgentPass lets you hand an AI agent a budget and rules, and guarantees it can't break them — even if it gets tricked.

## Problem
AI agents can now buy things (Google/Shopify UCP, OpenAI/Stripe ACP, Visa and Mastercard agent programmes). Three parties are exposed:

- **The buyer** fears overspending or wrong purchases. Real case: in Feb 2025 OpenAI's Operator bought a Washington Post columnist a dozen eggs for **$31.43 without his approval** ([WaPo](https://www.washingtonpost.com/technology/2025/02/07/openai-operator-ai-agent-chatgpt/), [AI Incident #1028](https://incidentdatabase.ai/cite/1028/)).
- **The merchant** can't tell an authorised agent from a rogue bot, and eats the chargeback when a buyer says "I didn't approve that."
- **The agent** can be manipulated. Hidden text on a product page can steer it ("prompt injection"). Researchers broke a Google AP2 shopping agent this way in Jan 2026 ([arXiv 2601.22569](https://arxiv.org/abs/2601.22569)); Palo Alto Unit 42 has seen it in the wild ([Unit 42](https://unit42.paloaltonetworks.com/ai-agent-prompt-injection/)).

## Solution
1. **Mandate** — the buyer sets rules once: total budget, per-order cap, categories, allowed sellers, "ask me above £X", expiry.
2. **Agent** — a Grok-powered agent searches the store and proposes a cart.
3. **Gate** — deterministic code checks the cart against the mandate → `APPROVE`, `ASK_HUMAN` or `BLOCK` with a reason. The LLM never makes this decision.
4. **Receipt** — approved carts get a signed token; the order is created only with a valid token and is tagged `agentpass-verified` in Shopify.
5. **Log** — every decision (including blocked attacks) is recorded and visible.

## Wedge (who first) — see audit
**B2B restocking for resellers** (Fleek's customers). Example: Sara runs a vintage shop in Hackney. She wants: *"Restock 90s denim, max £500/week, only sellers rated 4.5+, ask me above £200."* Today she checks listings by hand every day. With AgentPass the agent restocks while she sleeps, and she can't wake up to a £3,000 surprise.

Later users:
- **Consumers** — "reorder coffee and nappies, £60/month, same brands only"
- **Shopify merchants** — accept agent orders safely; verified receipts cut disputes
- **Agent platforms** (e.g. Wassist) — one SDK call before any purchase

## Final product (the vision)
- **Buyer wallet** — one place to set rules for all your agents and see what they bought
- **Merchant app** (Shopify) — only accept verified agent orders; "agent-safe" badge
- **SDK / API** — any agent calls `POST /gate` before buying; mandates compatible with Google AP2 format later
- **Marketplace licence** — e.g. Fleek offers "auto-restock" to its buyers, powered by AgentPass

## Business model
| Who pays | How | Why they'd pay |
|---|---|---|
| Merchants | ~0.5% of agent-placed GMV | Cheaper than chargebacks; unlocks agent traffic |
| Agent platforms | Monthly SDK fee | Trust without building it |
| Marketplaces (B2B) | Licence / rev share | More automated repeat orders |

## What we are NOT
Not a payment processor, not a wallet holding money, not a card network. We never touch card data (smaller compliance burden). We sit **before** checkout and decide what's allowed.
