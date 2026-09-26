// SHARED CONTRACT — all three of us code against these types.
// Change only after agreeing in the team chat, then merge to main immediately.

export type Mandate = {
  id: string;
  owner: string; // "Sara — Hackney Vintage"
  weeklyBudget: number; // GBP
  perOrderCap: number;
  askAbove: number; // orders above this need a human "yes"
  allowedCategories: string[]; // lowercase, e.g. ["denim", "outerwear"]
  allowedVendors: string[] | null; // null = any vendor
  maxQtyPerItem: number;
  expiresAt: string; // ISO date
};

export type Product = {
  id: string;
  variantId: string;
  title: string;
  category: string; // lowercase
  vendor: string;
  price: number; // GBP, source of truth = Shopify
  description: string; // UNTRUSTED: may contain prompt injection
};

export type CartItem = {
  variantId: string;
  title: string;
  category: string;
  vendor: string;
  unitPrice: number; // as claimed by the agent — the Gate re-checks it
  quantity: number;
};

export type Cart = {
  items: CartItem[];
  total: number; // as claimed by the agent — the Gate recomputes it
  agentNote?: string;
};

export type Decision = "APPROVE" | "ASK_HUMAN" | "BLOCK";

export type GateContext = {
  spentThisWeek: number;
  livePrices: Record<string, number>; // variantId -> price fetched from Shopify
  now: Date;
};

export type GateResult = {
  decision: Decision;
  reasons: string[];
  checkedTotal: number; // total recomputed from live prices
};

// POST /api/agent
export type AgentRequest = { message: string; mandateId: string };
export type AgentResponse = { reply: string; cart: Cart | null };

// POST /api/gate
export type GateRequest = { cart: Cart; mandateId: string };
export type GateResponse = GateResult & {
  decisionId: string;
  receipt?: string; // signed JWT, only when APPROVE
  approvalToken?: string; // signed JWT, only when ASK_HUMAN
};

// POST /api/approve
export type ApproveRequest = { approvalToken: string; approved: boolean };
export type ApproveResponse = { receipt?: string; decision: Decision };

// POST /api/order
export type OrderRequest = { cart: Cart; receipt: string };
export type OrderResponse = { orderId: string; orderName: string; tags: string[] };
