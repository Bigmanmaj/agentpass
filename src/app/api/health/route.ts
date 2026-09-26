// OWNER: P2. Which integrations are live vs mocked on this deployment. Booleans only — never key values.
// ?probe=1 also makes one real Shopify call to prove the credentials work.
import { mocks } from "@/lib/env";
import { searchProducts } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const live = Object.fromEntries(Object.entries(mocks).map(([k, isMock]) => [k, !isMock]));
  const res: Record<string, unknown> = { live, secretSet: !!process.env.AGENTPASS_SECRET };

  if (new URL(req.url).searchParams.get("probe")) {
    try {
      const products = await searchProducts("denim jacket");
      res.shopify = { ok: true, source: mocks.shopify ? "mock catalogue" : "Shopify store", products: products.length, sampleVariantId: products[0]?.variantId };
    } catch (e) {
      res.shopify = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return Response.json(res);
}
