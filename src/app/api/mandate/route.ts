// OWNER: P1. Change Sara's spending limits. The Gate still decides every cart.
import { getMandate, updateMandateLimits } from "@/lib/db";
import type { MandateUpdateRequest, MandateUpdateResponse } from "@/lib/types";

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as MandateUpdateRequest | null;
  if (!body || typeof body.mandateId !== "string") {
    return Response.json({ error: "Body must include mandateId and the three limits" }, { status: 400 });
  }
  const weeklyBudget = Number(body.weeklyBudget);
  const perOrderCap = Number(body.perOrderCap);
  const askAbove = Number(body.askAbove);
  try {
    await getMandate(body.mandateId);
    const mandate = await updateMandateLimits(body.mandateId, { weeklyBudget, perOrderCap, askAbove });
    return Response.json({ mandate } satisfies MandateUpdateResponse);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const missing = /not found/i.test(message);
    return Response.json({ error: message }, { status: missing ? 404 : 400 });
  }
}
