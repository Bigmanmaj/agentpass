# 03 — Pre-build audit (26 Sep 2026, ~10:30)

Goal: check every claim and dependency before writing code.

## Verdict
**GO, with 3 changes:** (1) use the xAI Grok API because the Grok Bot skill won't run on Windows, (2) stop claiming "nobody does this" — pitch the B2B reseller wedge and injection-proof Gate instead, (3) Shopify only; Commerce Layer is a stretch goal.

## 🔴 Blockers — resolve in the first 20 minutes
| # | Issue | Evidence | Fix |
|---|---|---|---|
| B1 | **Grok Bot skill is macOS-only.** It decrypts the session from the Mac Keychain (`security find-generic-password`) and needs the Grok Bot desktop app + SuperGrok Heavy / Cursor Ultra / Cursor Teams Premium. We're on Windows. | `scripts/grokbot.py`, README "Requirements" | Use the **xAI API** directly (`https://api.x.ai/v1`, model `grok-4.7`, OpenAI-compatible). Needs an API key **with credits** from console.x.ai. **Ask organisers at once** whether they give xAI credits. Fallback: a teammate's Mac for the Grok Bot part. |
| B2 | Judging criterion literally says "Grok Bot agent integration". | 01-hackathon.md | Ask organisers if the xAI API counts. If a Mac is available, add one Grok Bot teammate ("Procurement bot") that calls our Gate — nice extra, not core. |
| B3 | Shopify: since **1 Jan 2026** you can't create legacy custom apps in the admin. | [Shopify docs](https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens) | Create a **dev store + app in the Dev Dashboard**, install it, use the **client-credentials grant** (token lasts 24h). See 05-tech-reference.md. |

## 🟡 Corrections to what I said earlier
| Earlier claim | Reality | Impact |
|---|---|---|
| "Almost nobody is building trust & safety for agents" | **Wrong.** Nekuda ($5M, Visa & Amex Ventures) sells "agentic mandates" with spend limits and approvals. Skyfire (KYAPay), Coinbase Agentic Wallets, Crossmint, Payman all have spending caps. Google AP2 is literally built on signed mandates. | Originality drops from 5 → 3-4. Differentiate on **(a) merchant-side Gate for Shopify stores, (b) B2B wholesale restocking, (c) live prompt-injection defence**. Name the competitors in the pitch — judges respect it. |
| "OpenAI + Stripe ACP: agents checking out in ChatGPT" | ACP exists (Sep 2025), but **ChatGPT Instant Checkout was retired in March 2026** after ~a dozen Shopify merchants shipped. | Don't cite ACP as a success. Cite **UCP** (Google + Shopify, Jan 2026, 8,000+ stores by June, ~99% Shopify) as proof agent commerce is real. |
| Eggs story | **Verified**: $31.43, Feb 2025, WaPo's Geoffrey Fowler, AI Incident DB #1028. | Keep it — best hook. |
| Visa / Mastercard / Cloudflare | **Verified**: Visa Trusted Agent Protocol + Mastercard Agent Pay both use Cloudflare **Web Bot Auth** (Oct 2025). | These solve *who is this agent*, not *what may it buy*. That's our gap. |
| Prompt injection is real | **Verified**: arXiv 2601.22569 broke an AP2 shopping agent; Unit 42 observed it in the wild. | Justifies demo moment #3. |

## 🟢 Confirmed feasible today
| Piece | Status |
|---|---|
| xAI API: OpenAI-compatible, function calling, structured outputs | ✅ docs.x.ai (needs key + credits) |
| Shopify Admin GraphQL `draftOrderCreate` with `tags`, `note`, `customAttributes`, `metafields` | ✅ API version `2026-07`, scope `write_draft_orders` |
| Supabase free project for mandates + decision log | ✅ credits on the day |
| PostHog event capture | ✅ free tier |
| Signed receipt | ✅ HS256 JWT with `jose` — simple and enough for a demo |
| Commerce Layer | ✅ free dev plan, but a **second backend costs ~1h**. Stretch only. |

## Safety / scope decisions
- **No real payments.** We create Shopify **draft orders** only. No card data anywhere.
- WhatsApp approval is a **mock chat UI** (real WhatsApp Business setup takes too long).
- Secrets live in `.env.local` only; `.env*` is git-ignored.
- The Gate is pure code, unit-tested. The LLM output is treated as untrusted input.

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| No xAI credits | Medium | Ask now; fallback: run the agent on another model and label honestly, or skip LLM and script the cart (worst case) |
| Too many parts for 6h | High | Cut list in 06-build-plan.md; the Gate + 3 demo scenarios is the must-have |
| Judges ask "why not Nekuda/Visa?" | High | Answer in 07-pitch.md |
| Shopify setup eats time | Medium | One person does setup while another writes the Gate |

## Updated score (honest, /5)
| Criterion | Before | After audit | Why |
|---|---|---|---|
| Problem clarity | 4 | 4 | Eggs story + injection are concrete |
| Impact | 4 | 4 | Reseller wedge makes it real for Fleek |
| Prototype execution | 3 | 3 | Doable if we keep to the must-haves |
| AI / Grok integration | 5 | **4** | Grok via API, not Grok Bot app (B1/B2) |
| Commerce stack depth | 4 | **3** | Shopify + Supabase + PostHog; Commerce Layer only if time |
| Originality | 5 | **3.5** | Competitors exist; our angle is merchant-side + B2B + injection demo |
| Business value | 3.5 | 3.5 | Clear payer, but big players nearby |
| **Total** | 28.5 | **~25/35** | Still competitive; the injection demo is the differentiator |
