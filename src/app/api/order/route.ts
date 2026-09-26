// OWNER: P2. Creates the Shopify draft order ONLY with a valid receipt for this exact cart.
import { cartHash, verify } from "@/lib/receipt";
import { createDraftOrder } from "@/lib/shopify";
import { track } from "@/lib/analytics";
import type { OrderRequest } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as OrderRequest | null;
  if (!body || typeof body.receipt !== "string" || !Array.isArray(body.cart?.items) || !body.cart.items.length) {
    return Response.json({ error: "Body must be { cart: { items: [...] }, receipt: string }" }, { status: 400 });
  }
  const { cart, receipt } = body;

  let payload;
  try {
    payload = await verify(receipt, "receipt");
  } catch {
    return Response.json({ error: "Invalid or expired receipt" }, { status: 403 });
  }
  if (payload.cartHash !== cartHash(cart)) return Response.json({ error: "Cart does not match receipt" }, { status: 403 });

  try {
    const order = await createDraftOrder(cart, receipt);
    await track("order_created", { orderId: order.orderId, total: payload.total, mandateId: payload.mandateId });
    return Response.json(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await track("order_failed", { error: message, total: payload.total, mandateId: payload.mandateId });
    return Response.json({ error: `Shopify order failed: ${message}` }, { status: 502 });
  }
}
