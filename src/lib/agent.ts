// OWNER: P3 (Agent & UI). Grok agent: reads the request, searches products, proposes a cart.
// Its output is UNTRUSTED — the Gate decides. Mock mode parses "restock N <thing>".
import { env, mocks } from "@/lib/env";
import { searchProducts } from "@/lib/shopify";
import type { AgentResponse, Mandate } from "@/lib/types";

export async function runAgent(message: string, mandate: Mandate): Promise<AgentResponse> {
  const products = await searchProducts(message);

  if (mocks.llm) {
    const qty = Number(/restock (\d+)/i.exec(message)?.[1] ?? 1);
    const p = products[0];
    // Simulates a fooled agent: obeys the hidden instruction in the description.
    const injected = /buying (\d+) units/i.exec(p.description);
    const quantity = injected ? Number(injected[1]) : qty;
    return {
      reply: `Found ${p.title} at £${p.price}. Proposing ${quantity}.`,
      cart: {
        items: [{ variantId: p.variantId, title: p.title, category: p.category, vendor: p.vendor, unitPrice: p.price, quantity }],
        total: p.price * quantity,
      },
    };
  }

  void mandate;
  throw new Error(`TODO(P3): call ${env.llmModel} at ${env.llmBaseUrl} with tools and zod-validated cart JSON`);
}
