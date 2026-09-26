# 05 — Tech reference (verified 26 Sep 2026)

Put all secrets in `.env.local` (git-ignored). See `.env.example`.

## xAI Grok API (the agent)
- Base URL: `https://api.x.ai/v1` · Header: `Authorization: Bearer $XAI_API_KEY`
- Model: `grok-4.7` (flagship, tool calling). OpenAI-SDK compatible.
- Key + credits: https://console.x.ai → API Keys. **Needs loaded credits.**
- Function calling: https://docs.x.ai/docs/guides/function-calling
- Vercel AI SDK provider: https://ai-sdk.dev/providers/ai-sdk-providers/xai

```ts
import OpenAI from "openai";
const grok = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: "https://api.x.ai/v1" });
const r = await grok.chat.completions.create({
  model: "grok-4.7",
  messages: [{ role: "user", content: "..." }],
  tools: [/* search_products, propose_cart */],
});
```

## Grok Bot skill (reference only — macOS)
https://github.com/adamanz/grok-bot-skill · copy in `docs/ref-grok-bot-skill.md`
Requires macOS + Grok Bot desktop app + SuperGrok Heavy / Cursor Ultra / Cursor Teams Premium. Commands: `status`, `list`, `chat`, `send`, `create`, `update`, `transcript`. **Won't run on Windows.**

## Shopify (the store)
Setup (Dev Dashboard, since legacy custom apps are gone from 1 Jan 2026):
1. Dev Dashboard → create **dev store** (add a few products: "90s Levi's denim jacket", etc.)
2. Dev Dashboard → create **app** → select scopes: `read_products`, `write_draft_orders`, `read_draft_orders`
3. Install the app on the dev store
4. App → Settings → copy Client ID + Client secret

Token (client credentials; app and store must be in the same org; lasts 24h — cache it):
```
POST https://{SHOP}.myshopify.com/admin/oauth/access_token
Content-Type: application/x-www-form-urlencoded
grant_type=client_credentials&client_id=...&client_secret=...
```
Admin GraphQL:
```
POST https://{SHOP}.myshopify.com/admin/api/2026-07/graphql.json
X-Shopify-Access-Token: {token}
```
Products search:
```graphql
query($q:String!){ products(first:10, query:$q){ nodes{ id title productType vendor tags
  variants(first:1){ nodes{ id price inventoryQuantity } } } } }
```
Create order (draft, no payment):
```graphql
mutation($input: DraftOrderInput!){ draftOrderCreate(input:$input){ draftOrder{ id name } userErrors{ field message } } }
# input: { lineItems:[{variantId, quantity}], tags:["agentpass-verified"], note:"...",
#          customAttributes:[{key:"agentpass_receipt", value:"<jwt>"}] }
```
Docs: [client credentials](https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens) · [draftOrderCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftOrderCreate)

## Supabase (mandates + log)
- Create a project; use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` **server-side only**.
- Tables in 06-build-plan.md. Docs: https://supabase.com/docs

## PostHog (analytics)
- `posthog-node` server-side: `capture({ distinctId, event: "gate_decision", properties:{decision, reason} })`
- Docs: https://posthog.com/docs

## Tavily (optional: price check)
- `POST https://api.tavily.com/search` with `{ query, max_results }`, header `Authorization: Bearer $TAVILY_API_KEY`
- Docs: https://docs.tavily.com/documentation/api-reference/introduction

## Commerce Layer (stretch only)
- Free dev plan: https://dashboard.commercelayer.io/sign_up
- Token: `POST https://auth.commercelayer.io/oauth/token` (`grant_type=client_credentials`, `client_id`, `client_secret` for integrations; sales channels need `scope=market:code:...`)
- API base: `https://{org-slug}.commercelayer.io/api` (JSON:API)

## Signed receipt
`jose` HS256 JWT: `{ mandate_id, cart_hash, total, iat, exp }` signed with `AGENTPASS_SECRET`. Order creation verifies it and that `cart_hash` matches.
