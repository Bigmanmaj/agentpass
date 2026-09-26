// OWNER: P1
import { evaluateCart } from "@/lib/gate/evaluate";
import { getMandate, logDecision, spentThisWeek } from "@/lib/db";
import { getLivePrices } from "@/lib/shopify";
import { sign } from "@/lib/receipt";
import { track } from "@/lib/analytics";
import type { GateRequest, GateResponse } from "@/lib/types";

export async function POST(req: Request) {
  const { cart, mandateId } = (await req.json()) as GateRequest;
  const mandate = await getMandate(mandateId);
  const result = evaluateCart(mandate, cart, {
    spentThisWeek: await spentThisWeek(mandateId),
    livePrices: await getLivePrices(cart.items.map((i) => i.variantId)),
    now: new Date(),
  });
  const decisionId = await logDecision({ mandateId, cart, total: result.checkedTotal, decision: result.decision, reasons: result.reasons });
  await track("gate_decision", { decision: result.decision, total: result.checkedTotal, reasons: result.reasons });

  const res: GateResponse = { ...result, decisionId };
  if (result.decision === "APPROVE") res.receipt = await sign("receipt", mandateId, cart, result.checkedTotal, decisionId);
  if (result.decision === "ASK_HUMAN") res.approvalToken = await sign("approval", mandateId, cart, result.checkedTotal, decisionId);
  return Response.json(res);
}
