// OWNER: P1
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("approve rejects a bad or wrong-kind token with 403, not 500", async () => {
    const receipt = await sign("receipt", "demo", cart, 240, "decision-3"); // a receipt is not an approval token
    for (const approvalToken of ["not-a-jwt", receipt]) {
      const res = await approve(new Request("http://x", { method: "POST", body: JSON.stringify({ approvalToken, approved: true }) }));
      expect(res.status).toBe(403);
      expect((await res.json()).error).toMatch(/approval token/i);
    }
  });
});

describe("production secret guard", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses to sign in production when AGENTPASS_SECRET is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AGENTPASS_SECRET", "");
    await expect(sign("receipt", "demo", cart, 160, "d1")).rejects.toThrow(/AGENTPASS_SECRET/);
  });

  it("refuses a short secret in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AGENTPASS_SECRET", "too-short");
    await expect(sign("receipt", "demo", cart, 160, "d1")).rejects.toThrow(/AGENTPASS_SECRET/);
  });

  it("signs and verifies in production with a proper secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AGENTPASS_SECRET", "a".repeat(64));
    const token = await sign("receipt", "demo", cart, 160, "d1");
    expect((await verify(token, "receipt")).decisionId).toBe("d1");
  });

  it("a token signed with the public default secret is rejected in production", async () => {
    const forged = await sign("receipt", "demo", cart, 160, "d1"); // dev mode: default secret
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AGENTPASS_SECRET", "a".repeat(64));
    await expect(verify(forged, "receipt")).rejects.toThrow();
  });
});
