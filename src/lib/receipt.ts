// OWNER: P1. Signed receipts (APPROVE) and approval tokens (ASK_HUMAN).
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import type { Cart } from "@/lib/types";

// The dev default secret is public (it's in the repo). In production, refuse to sign or verify
// without a real secret, so a missing env var fails closed instead of accepting forged receipts.
// Read at call time, not import time, so the check always sees the live env.
const key = () => {
  const secret = process.env.AGENTPASS_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32))
    throw new Error("AGENTPASS_SECRET must be set (32+ characters) in production");
  return new TextEncoder().encode(secret || env.agentpassSecret);
};

export type TokenPayload = {
  kind: "receipt" | "approval";
  mandateId: string;
  decisionId: string; // the /api/order route marks this decision as used (one order per receipt)
  cartHash: string;
  total: number;
  human?: boolean; // receipt issued after a human "yes"
};

export function cartHash(cart: Cart): string {
  return cart.items.map((i) => `${i.variantId}x${i.quantity}`).sort().join("|");
}

async function issue(claims: TokenPayload) {
  return new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("15m").sign(key());
}

export async function sign(kind: "receipt" | "approval", mandateId: string, cart: Cart, total: number, decisionId: string) {
  return issue({ kind, mandateId, decisionId, cartHash: cartHash(cart), total });
}

// After a human "yes": same decision, same cart, now a receipt.
export async function receiptFromApproval(p: TokenPayload) {
  return issue({ kind: "receipt", mandateId: p.mandateId, decisionId: p.decisionId, cartHash: p.cartHash, total: p.total, human: true });
}

export async function verify(token: string, kind: "receipt" | "approval"): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, key());
  if (payload.kind !== kind) throw new Error(`Expected ${kind} token`);
  return payload as unknown as TokenPayload;
}
