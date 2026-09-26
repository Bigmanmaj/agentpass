// OWNER: P3
import { runAgent } from "@/lib/agent";
import { getMandate } from "@/lib/db";
import type { AgentRequest, AgentResponse } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { message, mandateId } = (await req.json()) as AgentRequest;
  const mandate = await getMandate(mandateId);
  try {
    return Response.json(await runAgent(message, mandate));
  } catch (e) {
    // No silent fallback to the mock: the UI shows the error and the demo moves on.
    const reply = `Agent error: ${e instanceof Error ? e.message : String(e)}`;
    return Response.json({ reply, cart: null } satisfies AgentResponse, { status: 502 });
  }
}
