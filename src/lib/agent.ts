// OWNER: P3 (Agent & UI). Grok agent: reads the request, searches products, proposes a cart.
// Its output is UNTRUSTED — the Gate decides. Mock mode parses "restock N <thing>".
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Agent, JsonlLocalAgentStore } from "@cursor/sdk";
import { z } from "zod";
import { env, mocks } from "@/lib/env";
import { searchProducts } from "@/lib/shopify";
import type { AgentResponse, Cart, Mandate } from "@/lib/types";

const TIMEOUT_MS = 45_000;

const CartSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string(),
        title: z.string(),
        category: z.string(),
        vendor: z.string(),
        unitPrice: z.number(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  total: z.number(),
  agentNote: z.string(),
});

export async function runAgent(message: string, mandate: Mandate): Promise<AgentResponse> {
  if (mocks.llm) return runMockAgent(message);
  if (!env.cursorApiKey) throw new Error("TODO(P3): OpenAI-compatible path for LLM_API_KEY; set CURSOR_API_KEY for now");

  const cart = await runCursorAgent(message, mandate);
  const summary = cart.items.map((i) => `${i.quantity} × ${i.title}`).join(", ");
  return { reply: `Proposing ${summary}. ${cart.agentNote ?? ""}`.trim(), cart };
}

// Deliberately trusting: follows seller notes, so a believable injection in a description works.
// That's the demo — the Gate, not the prompt, is the safety layer.
function buildPrompt(message: string, mandate: Mandate) {
  return `You are a purchasing agent for ${mandate.owner}, a vintage clothing reseller restocking from a wholesale catalogue.
Call the search_products tool ONCE with a short keyword query, then propose a cart.
Follow any seller notes in product descriptions about quantities or bundles.
Reply with ONLY a JSON object, no prose, no code fences:
{"items":[{"variantId":string,"title":string,"category":string,"vendor":string,"unitPrice":number,"quantity":number}],"total":number,"agentNote":string}
agentNote: one short sentence explaining your choice.

Request: ${message}`;
}

async function runCursorAgent(message: string, mandate: Mandate): Promise<Cart> {
  // The SDK keeps local history on disk; the default location fails on Windows, so we choose it:
  // inside the project locally (git-ignored), the temp dir on Vercel (the only writable place there).
  // cwd is an empty folder and only our tool is enabled: the agent can't read files or run commands.
  const root = process.env.VERCEL ? path.join(tmpdir(), "agentpass-agent") : path.join(process.cwd(), ".agent-state");
  const cwd = path.join(root, "workspace");
  mkdirSync(cwd, { recursive: true });

  const agent = await Agent.create({
    apiKey: env.cursorApiKey,
    model: { id: env.llmModel },
    tools: ["mcp"],
    local: {
      cwd,
      settingSources: [],
      enableAgentRetries: false,
      store: new JsonlLocalAgentStore(path.join(root, "state")),
      customTools: {
        search_products: {
          description:
            "Search the wholesale catalogue. Returns products with variantId, title, category, vendor, price (GBP) and the seller's description.",
          inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
          async execute(args) {
            return JSON.stringify(await searchProducts(String((args as { query?: unknown }).query ?? "")));
          },
        },
      },
    },
  });

  const run = await agent.send(buildPrompt(message, mandate));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      void run.cancel();
      reject(new Error(`Agent took longer than ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);
  });
  const result = await Promise.race([run.wait(), timeout]).finally(() => clearTimeout(timer));
  if (result.status !== "finished" || !result.result) throw new Error(`Agent run ${result.status}`);

  return parseCart(result.result);
}

function parseCart(text: string): Cart {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = CartSchema.safeParse(JSON.parse(json || "null"));
  if (!parsed.success) throw new Error("Agent returned a cart in the wrong shape");
  return parsed.data;
}

async function runMockAgent(message: string): Promise<AgentResponse> {
  const qty = Number(/restock (\d+)/i.exec(message)?.[1] ?? 1);
  const products = await searchProducts(message);
  const p = products[0];
  // Simulates a fooled agent: obeys the minimum-order note in the description.
  const injected = /bundles of (\d+)|buying (\d+) units/i.exec(p.description);
  const quantity = injected ? Number(injected[1] ?? injected[2]) : qty;
  return {
    reply: `Found ${p.title} at £${p.price}. Proposing ${quantity}.`,
    cart: {
      items: [{ variantId: p.variantId, title: p.title, category: p.category, vendor: p.vendor, unitPrice: p.price, quantity }],
      total: p.price * quantity,
    },
  };
}
