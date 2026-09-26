// OWNER: P3
import { runAgent } from "@/lib/agent";
import { getMandate } from "@/lib/db";
import type { AgentRequest } from "@/lib/types";

export async function POST(req: Request) {
  const { message, mandateId } = (await req.json()) as AgentRequest;
  const mandate = await getMandate(mandateId);
  return Response.json(await runAgent(message, mandate));
}
