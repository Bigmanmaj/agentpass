// OWNER: P1
import { describe, expect, it } from "vitest";
import { sign, verify } from "./receipt";
import { POST as approve } from "@/app/api/approve/route";

const cart = { items: [{ variantId: "v1", title: "Jacket", category: "denim", vendor: "X", unitPrice: 40, quantity: 6 }], total: 240 };

describe("receipt", () => {
  it("carries the decisionId so the order route can mark it used", async () => {
    const token = await sign("receipt", "demo", cart, 160, "decision-1");
    expect((await verify(token, "receipt")).decisionId).toBe("decision-1");
  });

  it("rejects a token of the wrong kind", async () => {
    const token = await sign("approval", "demo", cart, 240, "decision-1");
    await expect(verify(token, "receipt")).rejects.toThrow(/receipt/);
  });

  it("human approval turns an approval token into a receipt for the same decision", async () => {
    const approvalToken = await sign("approval", "demo", cart, 240, "decision-2");
    const res = await approve(new Request("http://x", { method: "POST", body: JSON.stringify({ approvalToken, approved: true }) }));
    const body = await res.json();
    expect(body.decision).toBe("APPROVE");
    const p = await verify(body.receipt, "receipt");
    expect(p.decisionId).toBe("decision-2");
    expect(p.total).toBe(240);
  });
});
