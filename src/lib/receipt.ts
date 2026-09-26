// OWNER: P1. Signed receipts (APPROVE) and approval tokens (ASK_HUMAN).
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import type { Cart } from "@/lib/types";

const key = () => new TextEncoder().encode(env.agentpassSecret);

export function cartHash(cart: Cart): string {
  return cart.items.map((i) => `${i.variantId}x${i.quantity}`).sort().join("|");
}

export async function sign(kind: "receipt" | "approval", mandateId: string, cart: Cart, total: number) {
  return new SignJWT({ kind, mandateId, cartHash: cartHash(cart), total })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key());
}

export async function verify(token: string, kind: "receipt" | "approval") {
  const { payload } = await jwtVerify(token, key());
  if (payload.kind !== kind) throw new Error(`Expected ${kind} token`);
  return payload as { kind: string; mandateId: string; cartHash: string; total: number };
}
