// OWNER: P1. Human answers the ASK_HUMAN prompt (mock WhatsApp).
import { SignJWT } from "jose";
import { verify } from "@/lib/receipt";
import { env } from "@/lib/env";
import { track } from "@/lib/analytics";
import type { ApproveRequest, ApproveResponse } from "@/lib/types";

export async function POST(req: Request) {
  const { approvalToken, approved } = (await req.json()) as ApproveRequest;
  const p = await verify(approvalToken, "approval");
  await track("human_approval", { approved, total: p.total });
  if (!approved) return Response.json({ decision: "BLOCK" } satisfies ApproveResponse);

  const receipt = await new SignJWT({ kind: "receipt", mandateId: p.mandateId, cartHash: p.cartHash, total: p.total, human: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(env.agentpassSecret));
  return Response.json({ decision: "APPROVE", receipt } satisfies ApproveResponse);
}
