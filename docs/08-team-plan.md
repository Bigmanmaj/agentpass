# 08 — Team plan (3 people)

Repo: https://github.com/francescococcia/agentpass

## How we avoid stepping on each other
1. **Same baseline.** `main` already runs end to end with **mocks** (no keys needed). Everyone starts from it.
2. **One owner per file.** Every file says `// OWNER: P1/P2/P3` at the top. Edit only your own files.
3. **Shared contract is frozen.** `src/lib/types.ts`, `src/lib/env.ts`, `package.json`: change only after a "OK?" in the team chat, then merge to `main` straight away and tell the others to pull.
4. **Mocks switch off per person.** Each integration uses its mock until *its* keys are in `.env.local`. So P2 can go live on Shopify while P3 still uses the mock LLM, etc.
5. **Own branch, merge at checkpoints.** `p1/gate`, `p2/commerce`, `p3/agent-ui`.

## Setup (each person, 3 min)
```bash
git clone https://github.com/francescococcia/agentpass
cd agentpass
npm install
cp .env.example .env.local
git checkout -b p1/gate        # or p2/commerce, p3/agent-ui
npm run dev                    # http://localhost:3000 — try the 3 buttons
npm run check                  # typecheck + tests, run before every merge
```
Share keys **privately** (DM), never in the repo. The repo is public.

## Who does what
### P1 — Gate & Trust (Francesco: security background)
Files: `src/lib/gate/**`, `src/lib/db.ts`, `src/lib/receipt.ts`, `src/app/api/gate/**`, `src/app/api/approve/**`, `supabase/schema.sql`
- [ ] All 9 Gate rules from 06-build-plan.md, one test each (category, vendor, qty, price mismatch, weekly budget…)
- [ ] Supabase project → run `schema.sql` → replace the TODOs in `db.ts`
- [ ] `/decisions` log page (stretch — or show the Supabase table)
- [ ] Owns the "why the Gate can't be fooled" part of the pitch

### P2 — Commerce (Shopify + partners)
Files: `src/lib/shopify.ts`, `src/lib/analytics.ts`, `src/lib/market.ts` (new), `src/app/api/order/**`, `data/products.json`, `scripts/**`
- [ ] **First thing:** Shopify Dev Dashboard → dev store + app (scopes `read_products`, `write_draft_orders`, `read_draft_orders`) → install → client ID/secret
- [ ] Create the 8 products from `data/products.json` in the store (incl. the injected 501 description)
- [ ] Replace TODOs in `shopify.ts`: token (cache 24h), `searchProducts`, `getLivePrices`, `createDraftOrder` with tag `agentpass-verified`
- [ ] PostHog in `analytics.ts`; Tavily price check (stretch)
- [ ] Deploy to Vercel at ~15:15 and put env vars there

### P3 — Agent & UI & Pitch
Files: `src/lib/agent.ts`, `src/app/api/agent/**`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/**` (new), `docs/07-pitch.md`
- [ ] **First thing:** get the LLM key (see "Credits" below)
- [ ] Replace the mock in `agent.ts` with Grok: tool `search_products` → returns cart JSON, validated with `zod`. Keep the product descriptions in the prompt (that's how the injection works in the demo — on purpose)
- [ ] Real UI: mandate card, chat, decision cards (green/amber/red), WhatsApp-style approval
- [ ] Pitch deck / script, record a backup video at 16:00

## Checkpoints (merge to main)
| Time | What must work on `main` |
|---|---|
| **12:30** | Gate rules + tests (P1), Shopify search live (P2), Grok returns a cart (P3) |
| **14:30** | Full flow with real Shopify draft order + Supabase log |
| **15:45** | UI polished, deployed on Vercel, 3 scenarios pass |
| **16:00** | Feature freeze. Rehearse twice. Backup video. |
| **16:30** | Code freeze & submit |

Merge routine: `git pull origin main` into your branch → `npm run check` → open a PR or merge → say "merged" in chat.

## Credits: what to use (from the tech-partners section)
| Partner | Offer | Use it? |
|---|---|---|
| **Supabase** | Credits on the day (free tier is enough anyway) | ✅ Yes, for mandates + log |
| **Tavily** | Credits "provided by Greta" | ✅ Claim; P2 adds a "market price check" if time (helps *stack depth*) |
| **Cursor** | IDE/CLI/SDK; prize is Cursor Ultra | ✅ All three code in Cursor (sponsor + tools) |
| **Grok Bot** | Skill only, **no API credits listed**; skill is macOS-only | ⚠️ Ask organisers for xAI credits. If a teammate has a Mac + eligible plan, demo one Grok Bot calling our API as a bonus |
| **Vercel** | Swag for top teams; free Hobby deploy | ✅ Deploy. **AI Gateway** also has monthly free credits on a free-tier model subset — check if a Grok model is included |
| **PostHog** | Free tier | ✅ 10 min of work, shows analytics |
| **Shopify** | Free dev store | ✅ Core |
| Commerce Layer / Recharge / Sanity | Nothing special | ❌ Skip (time) |

**LLM key, in order of preference:** (1) xAI credits from organisers → `LLM_BASE_URL=https://api.x.ai/v1`, `LLM_MODEL=grok-4.7`; (2) Vercel AI Gateway free credits → `LLM_BASE_URL=https://ai-gateway.vercel.sh/v1`, `LLM_MODEL=xai/<grok model shown in the gateway list>`; (3) pay ~$5 on console.x.ai. The code works with any of them — only `.env.local` changes.
