// OWNER: P2 (Commerce). Shopify Admin GraphQL. Uses data/products.json until keys are set.
// Setup + queries: docs/05-tech-reference.md
import products from "../../data/products.json";
import { env, mocks } from "@/lib/env";
import type { Cart, OrderResponse, Product } from "@/lib/types";

const catalog = products as Product[];

type UserError = { field?: string[] | null; message: string };

let cachedToken: { value: string; expiresAt: number } | null = null;

// Connection-level failures only: the request never reached Shopify, so retrying can't duplicate an order.
const CONNECT_ERRORS = new Set(["ETIMEDOUT", "ECONNREFUSED", "ENETUNREACH", "EAI_AGAIN", "ENOTFOUND", "UND_ERR_CONNECT_TIMEOUT"]);

async function shopifyFetch(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      const code = (e as { cause?: { code?: string } }).cause?.code;
      if (attempt >= 3 || !code || !CONNECT_ERRORS.has(code)) throw e;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const res = await shopifyFetch(`https://${env.shopifyShop}.myshopify.com/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.shopifyClientId,
      client_secret: env.shopifyClientSecret,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify token request failed: ${res.status} ${/<title>([\s\S]*?)<\/title>/.exec(text)?.[1] ?? text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  const ttlSeconds = json.expires_in ?? 86_400;
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (ttlSeconds - 300) * 1000 };
  return json.access_token;
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await shopifyFetch(
    `https://${env.shopifyShop}.myshopify.com/admin/api/${env.shopifyApiVersion}/graphql.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": await getToken() },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    },
  );
  if (res.status === 401) cachedToken = null;
  const json = (await res.json().catch(() => ({}))) as { data?: T; errors?: unknown };
  if (!res.ok || json.errors) throw new Error(`Shopify GraphQL error: ${res.status} ${JSON.stringify(json.errors ?? "")}`);
  return json.data as T;
}

function throwOnUserErrors(label: string, errors: UserError[]) {
  if (errors.length) throw new Error(`${label}: ${errors.map((e) => e.message).join("; ")}`);
}

function rank(query: string, list: Product[]): Product[] {
  const q = query.toLowerCase();
  const score = (p: Product) =>
    `${p.title} ${p.category}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && q.includes(w)).length;
  const hits = list.filter((p) => score(p) > 0).sort((a, b) => score(b) - score(a));
  return hits.length ? hits : list;
}

type ProductNode = {
  id: string;
  title: string;
  productType: string;
  vendor: string;
  description: string;
  isGiftCard: boolean;
  variants: { nodes: { id: string; price: string }[] };
};

// Whole active catalogue (seeded demo products + the store's own products), ranked locally so
// results don't depend on Shopify's search syntax. Capped to keep the agent prompt small.
export async function searchProducts(query: string): Promise<Product[]> {
  if (mocks.shopify) return rank(query, catalog);
  const data = await gql<{ products: { nodes: ProductNode[] } }>(
    `{ products(first: 100, query: "status:active") {
        nodes { id title productType vendor description isGiftCard variants(first: 1) { nodes { id price } } }
      } }`,
  );
  const live: Product[] = data.products.nodes
    .filter((n) => n.variants.nodes.length && !n.isGiftCard)
    .map((n) => ({
      id: n.id,
      variantId: n.variants.nodes[0].id,
      title: n.title,
      category: n.productType.toLowerCase() || "uncategorized",
      vendor: n.vendor,
      price: Number(n.variants.nodes[0].price),
      description: n.description,
    }));
  return rank(query, live).slice(0, 25);
}

export async function getLivePrices(variantIds: string[]): Promise<Record<string, number>> {
  if (mocks.shopify) {
    return Object.fromEntries(catalog.filter((p) => variantIds.includes(p.variantId)).map((p) => [p.variantId, p.price]));
  }
  if (!variantIds.length) return {};
  const data = await gql<{ nodes: ({ id: string; price: string } | null)[] }>(
    `query($ids: [ID!]!) { nodes(ids: $ids) { ... on ProductVariant { id price } } }`,
    { ids: variantIds },
  );
  return Object.fromEntries(data.nodes.filter((n) => n?.id).map((n) => [n!.id, Number(n!.price)]));
}

export async function createDraftOrder(cart: Cart, receipt: string): Promise<OrderResponse> {
  if (mocks.shopify) {
    return { orderId: `mock-${Date.now()}`, orderName: `#D${Math.floor(Math.random() * 900 + 100)}`, tags: ["agentpass-verified"] };
  }
  const data = await gql<{
    draftOrderCreate: { draftOrder: { id: string; name: string; tags: string[] } | null; userErrors: UserError[] };
  }>(
    `mutation($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id name tags }
        userErrors { field message }
      }
    }`,
    {
      input: {
        lineItems: cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        tags: ["agentpass-verified"],
        note: "Created by AgentPass",
        customAttributes: [{ key: "agentpass_receipt", value: receipt }],
      },
    },
  );
  throwOnUserErrors("draftOrderCreate", data.draftOrderCreate.userErrors);
  const order = data.draftOrderCreate.draftOrder!;
  return { orderId: order.id, orderName: order.name, tags: order.tags };
}
