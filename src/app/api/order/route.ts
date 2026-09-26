// OWNER: P2. Creates the Shopify draft order ONLY with a valid receipt for this exact cart.
import { cartHash, verify } from "@/lib/receipt";
import { createDraftOrder } from "@/lib/shopify";
import { track } from "@/lib/analytics";
import type { OrderRequest } from "@/lib/types";

export async function POST(req: Request) {
  const { cart, receipt } = (await req.json()) as OrderRequest;
  let payload;
  try {
    payload = await verify(receipt, "receipt");
  } catch {
    return Response.json({ error: "Invalid or expired receipt" }, { status: 403 });
  }
  if (payload.cartHash !== cartHash(cart)) return Response.json({ error: "Cart does not match receipt" }, { status: 403 });

  const order = await createDraftOrder(cart, receipt);
  await track("order_created", { orderId: order.orderId, total: payload.total });
  return Response.json(order);
}
