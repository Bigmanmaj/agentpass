// OWNER: P2. Full mock-mode flow: agent -> gate -> order, plus receipt tampering.
import { describe, expect, it } from "vitest";
import { POST as agent } from "@/app/api/agent/route";
import { POST as gate } from "@/app/api/gate/route";
import { POST as order } from "@/app/api/order/route";
import type { AgentResponse, Cart, GateResponse } from "@/lib/types";

const post = (handler: (req: Request) => Promise<Response>, body: unknown) =>
  handler(new Request("http://test", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

async function runScenario(message: string) {
  const a = (await (await post(agent, { message, mandateId: "demo" })).json()) as AgentResponse;
  const cart = a.cart as Cart;
  const g = (await (await post(gate, { cart, mandateId: "demo" })).json()) as GateResponse;
  return { cart, g };
}

describe("order flow (mock mode)", () => {
  it("scenario 1: 4 denim jackets -> APPROVE -> tagged draft order", async () => {
    const { cart, g } = await runScenario("Restock 4 denim jackets");
    expect(g.decision).toBe("APPROVE");
    const res = await post(order, { cart, receipt: g.receipt });
    expect(res.status).toBe(200);
    expect((await res.json()).tags).toContain("agentpass-verified");
  });

  it("rejects a receipt reused for a different cart", async () => {
    const { cart, g } = await runScenario("Restock 4 denim jackets");
    const tampered = { ...cart, items: cart.items.map((i) => ({ ...i, quantity: 25 })) };
    expect((await post(order, { cart: tampered, receipt: g.receipt })).status).toBe(403);
  });

  it("scenario 2: 6 denim jackets -> ASK_HUMAN, no receipt", async () => {
    const { g } = await runScenario("Restock 6 denim jackets");
    expect(g.decision).toBe("ASK_HUMAN");
    expect(g.receipt).toBeUndefined();
  });

  it("scenario 3: injected 501 description -> BLOCK", async () => {
    const { g } = await runScenario("Restock vintage 501 jeans");
    expect(g.decision).toBe("BLOCK");
    expect(g.receipt).toBeUndefined();
  });

  it("rejects forged receipts and malformed bodies", async () => {
    const { cart } = await runScenario("Restock 4 denim jackets");
    expect((await post(order, { cart, receipt: "not-a-jwt" })).status).toBe(403);
    expect((await post(order, "nope")).status).toBe(400);
  });
});
