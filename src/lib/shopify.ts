// OWNER: P2 (Commerce). Shopify Admin GraphQL. Uses data/products.json until keys are set.
// Setup + queries: docs/05-tech-reference.md
import products from "../../data/products.json";
import { env, mocks } from "@/lib/env";
import type { Cart, OrderResponse, Product } from "@/lib/types";

const catalog = products as Product[];

export async function searchProducts(query: string): Promise<Product[]> {
  if (mocks.shopify) {
    const q = query.toLowerCase();
    const score = (p: Product) =>
      `${p.title} ${p.category}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && q.includes(w)).length;
    const hits = catalog.filter((p) => score(p) > 0).sort((a, b) => score(b) - score(a));
    return hits.length ? hits : catalog;
  }
  throw new Error(`TODO(P2): products(query:) on ${env.shopifyShop}`);
}

export async function getLivePrices(variantIds: string[]): Promise<Record<string, number>> {
  if (mocks.shopify) {
    return Object.fromEntries(catalog.filter((p) => variantIds.includes(p.variantId)).map((p) => [p.variantId, p.price]));
  }
  throw new Error("TODO(P2): nodes(ids:) for ProductVariant prices");
}

export async function createDraftOrder(cart: Cart, receipt: string): Promise<OrderResponse> {
  if (mocks.shopify) {
    return { orderId: `mock-${Date.now()}`, orderName: `#D${Math.floor(Math.random() * 900 + 100)}`, tags: ["agentpass-verified"] };
  }
  void receipt;
  throw new Error("TODO(P2): draftOrderCreate with tag agentpass-verified + receipt in customAttributes");
}
