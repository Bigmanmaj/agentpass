# 04 — Market, real examples, competitors

## Signals that agent commerce is real
| Date | What | Source |
|---|---|---|
| Feb 2025 | OpenAI Operator buys eggs for $31.43 without approval | [WaPo](https://www.washingtonpost.com/technology/2025/02/07/openai-operator-ai-agent-chatgpt/) · [AIID #1028](https://incidentdatabase.ai/cite/1028/) |
| Sep 2025 | Google **AP2** — signed Intent / Cart / Payment mandates, 60+ partners | [Google Cloud blog](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol) · [spec](https://ap2-protocol.org/specification/) |
| Sep 2025 | OpenAI + Stripe **ACP** + Shared Payment Token. Instant Checkout **retired Mar 2026**; protocol continues | [Stripe](https://stripe.com/newsroom/news/stripe-openai-instant-checkout) · [Stripe docs](https://docs.stripe.com/agentic-commerce/acp) |
| Oct 2025 | Visa **Trusted Agent Protocol**, Mastercard **Agent Pay**, Amex — all on Cloudflare **Web Bot Auth** | [Cloudflare blog](https://blog.cloudflare.com/secure-agentic-commerce/) |
| Jan 2026 | Google + Shopify **UCP**; 8,000+ stores by Jun 2026, ~99% Shopify | [Shopify Engineering](https://shopify.engineering/UCP) · [Google Dev blog](https://developers.googleblog.com/under-the-hood-universal-commerce-protocol-ucp/) |
| Jan 2026 | Prompt injection breaks an AP2 shopping agent ("Branded Whisper") | [arXiv 2601.22569](https://arxiv.org/abs/2601.22569) |
| 2026 | Indirect prompt injection seen in the wild against agents | [Unit 42](https://unit42.paloaltonetworks.com/ai-agent-prompt-injection/) · [Zscaler](https://www.zscaler.com/blogs/security-research/indirect-prompt-injection-web-content-targets-ai-agents) |

## Competitors / neighbours
| Company | What they do | Gap we target |
|---|---|---|
| **Nekuda** ($5M, Madrona, Visa & Amex Ventures) | Agent wallet + "agentic mandates" SDK (limits, approvals), AP2-compatible | Buyer/agent-side, card-centric. We start **merchant-side on Shopify** and **B2B restock** |
| **Skyfire** (KYAPay) | JWT combining agent identity + spend claims | Identity-first; we focus on *what* may be bought (category, seller, quantity) |
| **Coinbase Agentic Wallets, Crossmint, Circle** | Crypto/stablecoin wallets with session & per-tx caps | Crypto rails; not Shopify merchants |
| **Payman** | Agentic banking with policy controls | Finance workflows, not shopping |
| **Visa / Mastercard / Cloudflare** | Verify the agent is genuine | Don't check the cart against the user's rules |

**Our positioning line:** *"Visa checks who the agent is. AgentPass checks what it's allowed to buy — and a prompt injection can't talk it out of the rules."*

Landscape reading: [Proxy — agent payments landscape 2026](https://www.useproxy.ai/blog/ai-agent-payments-landscape-2026) · [Eco — AI agent spend controls](https://eco.com/support/en/articles/14839409-ai-agent-spend-controls)

## Target users (personas)
1. **Sara, vintage reseller (primary).** Buys bales on Fleek weekly. Wants auto-restock of best sellers within a weekly budget. Pain: daily manual checking, fear of overspend.
2. **Tom, Shopify merchant.** Starting to see agent traffic. Pain: chargebacks, can't tell good bots from bad.
3. **Wassist-style agent platform.** Wants its WhatsApp agent to reorder for customers. Pain: liability if the agent overspends.
4. **Busy parent.** "Reorder nappies, £60/month cap." Pain: trust.
