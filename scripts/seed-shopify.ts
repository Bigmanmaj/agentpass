// OWNER: P2. Creates the demo products from data/products.json in the Shopify dev store.
// Run: node --env-file=.env.local scripts/seed-shopify.ts   (idempotent: updates existing titles in place)
import { readFileSync } from "node:fs";

type SeedProduct = { title: string; category: string; vendor: string; price: number; description: string };

const shop = process.env.SHOPIFY_SHOP;
const clientId = process.env.SHOPIFY_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
const version = process.env.SHOPIFY_API_VERSION || "2026-07";
if (!shop || !clientId || !clientSecret) throw new Error("Set SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET in .env.local");

async function getToken(): Promise<string> {
  const res = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId!, client_secret: clientSecret! }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${res.status} ${/<title>([\s\S]*?)<\/title>/.exec(text)?.[1] ?? text.slice(0, 300)}`);
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

async function gql<T>(token: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://${shop}.myshopify.com/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (!res.ok || json.errors) throw new Error(`GraphQL error: ${res.status} ${JSON.stringify(json.errors)}`);
  return json.data as T;
}

function assertNoUserErrors(label: string, errs: { field?: string[]; message: string }[]) {
  if (errs.length) throw new Error(`${label}: ${errs.map((e) => e.message).join("; ")}`);
}

const products = JSON.parse(readFileSync(new URL("../data/products.json", import.meta.url), "utf8")) as SeedProduct[];
const token = await getToken();

type ProductRef = { id: string; variants: { nodes: { id: string }[] } };
type UserErrors = { field?: string[]; message: string }[];

const existing = await gql<{ products: { nodes: (ProductRef & { title: string })[] } }>(
  token,
  `{ products(first: 100, query: "tag:agentpass-seed") { nodes { id title variants(first: 1) { nodes { id } } } } }`,
);
const byTitle = new Map(existing.products.nodes.map((p) => [p.title, p]));

for (const p of products) {
  const fields = { descriptionHtml: p.description, productType: p.category, vendor: p.vendor };
  let product: ProductRef | undefined = byTitle.get(p.title);
  if (product) {
    const updatedProduct = await gql<{ productUpdate: { userErrors: UserErrors } }>(
      token,
      `mutation($product: ProductUpdateInput!) { productUpdate(product: $product) { userErrors { field message } } }`,
      { product: { id: product.id, ...fields } },
    );
    assertNoUserErrors(`productUpdate ${p.title}`, updatedProduct.productUpdate.userErrors);
  } else {
    const created = await gql<{ productCreate: { product: ProductRef | null; userErrors: UserErrors } }>(
      token,
      `mutation($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product { id variants(first: 1) { nodes { id } } }
          userErrors { field message }
        }
      }`,
      { product: { title: p.title, ...fields, tags: ["agentpass-seed"], status: "ACTIVE" } },
    );
    assertNoUserErrors(`productCreate ${p.title}`, created.productCreate.userErrors);
    product = created.productCreate.product!;
  }
  if (!product) throw new Error(`No product for ${p.title}`);

  const updated = await gql<{ productVariantsBulkUpdate: { userErrors: UserErrors } }>(
    token,
    `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } }
    }`,
    { productId: product.id, variants: [{ id: product.variants.nodes[0].id, price: p.price.toFixed(2) }] },
  );
  assertNoUserErrors(`price ${p.title}`, updated.productVariantsBulkUpdate.userErrors);
  console.log(`${byTitle.has(p.title) ? "update" : "create"} ${p.title} £${p.price} -> ${product.id}`);
}
