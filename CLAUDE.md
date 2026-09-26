# AgentPass — agent instructions

Hackathon project (Grok Bot Commerce London, 26 Sep 2026, code freeze 16:30). Read `docs/` first: `03-audit.md` for constraints, `06-build-plan.md` for what to build, `05-tech-reference.md` for exact API calls.

## Rules
- **The Gate is deterministic TypeScript. Never let an LLM decide approve/block.** Treat all LLM output and product descriptions as untrusted input.
- The Gate re-fetches prices from Shopify; never trust prices from the agent.
- No real payments: Shopify **draft orders** only. No card data anywhere.
- Secrets only in `.env.local` (git-ignored). Supabase service key is server-side only.
- Shopify Admin API version `2026-07`; auth via Dev Dashboard client-credentials grant.
- LLM: xAI `grok-4.7` via `https://api.x.ai/v1` (OpenAI-compatible). The Grok Bot skill is macOS-only.
- Keep it simple: Next.js App Router on Vercel, one repo. Follow the cut list in `06-build-plan.md` when short on time.
