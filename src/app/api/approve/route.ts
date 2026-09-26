// OWNER: P1. Human answers the ASK_HUMAN prompt (mock WhatsApp).
import { receiptFromApproval, verify } from "@/lib/receipt";
import { track } from "@/lib/analytics";
import type { ApproveRequest, ApproveResponse } from "@/lib/types";

export async function POST(req: Request) {
  const { approvalToken, approved } = (await req.json()) as ApproveRequest;
  let p;
  try {
    p = await verify(approvalToken, "approval");
  } catch {
    return Response.json({ error: "Invalid or expired approval token" }, { status: 403 });
  }
  await track("human_approval", { approved, total: p.total });
  if (!approved) return Response.json({ decision: "BLOCK" } satisfies ApproveResponse);

  const receipt = await receiptFromApproval(p);
  return Response.json({ decision: "APPROVE", receipt } satisfies ApproveResponse);
}
