# AgentPass

**Spending rules for AI shopping agents.** A person or business says what their agent may buy (budget, categories, sellers, "ask me above £X"). Every cart the agent builds goes through the **Gate**, which approves it, blocks it, or asks the human. Approved orders carry a signed receipt so the merchant knows a real person authorised them.

Built at the **Grok Bot Commerce London Hackathon** (Fleek HQ, 26 Sep 2026). Track: **Agentic Commerce**.

## Start here
| Doc | What's in it |
|---|---|
| [docs/01-hackathon.md](docs/01-hackathon.md) | Event, tracks, judging criteria, schedule, stack, judges |
| [docs/02-idea.md](docs/02-idea.md) | Problem, solution, users, final product, business model |
| [docs/03-audit.md](docs/03-audit.md) | **Pre-build audit**: what's verified, what changed, blockers, score |
| [docs/04-market.md](docs/04-market.md) | Real examples, competitors, sources |
| [docs/05-tech-reference.md](docs/05-tech-reference.md) | Exact API endpoints and setup for every tool |
| [docs/06-build-plan.md](docs/06-build-plan.md) | Architecture, data model, Gate rules, timeline, cut list |
| [docs/07-pitch.md](docs/07-pitch.md) | 3-minute demo script and judge Q&A |
| [docs/ref-grok-bot-skill.md](docs/ref-grok-bot-skill.md) | Copy of the official Grok Bot skill (reference) |

## Golden rule
**The Gate is plain code, never the AI.** The LLM proposes carts; deterministic rules decide. That's why a prompt injection can fool the agent but can't get past the Gate.

## Status
- [x] Research and audit
- [ ] Setup (keys, Shopify dev store, Supabase)
- [ ] Build: mandate → agent → Gate → receipt → order
- [ ] Demo rehearsal (code freeze 16:30)
