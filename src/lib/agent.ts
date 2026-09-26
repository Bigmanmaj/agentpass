// OWNER: P3 (Agent & UI). Grok agent: reads the request, searches products, proposes a cart.
// Its output is UNTRUSTED — the Gate decides. Mock mode parses "restock N <thing>".
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Agent, JsonlLocalAgentStore } from "@cursor/sdk";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { z } from "zod";
import { env, mocks } from "@/lib/env";
import { searchProducts } from "@/lib/shopify";
import type { AgentResponse, Cart, Mandate } from "@/lib/types";

const TIMEOUT_MS = 45_000;
// Cursor path always runs Grok: LLM_MODEL may name a model for the OpenAI-compatible path (e.g. Gemini).
const CURSOR_MODEL = "grok-4.7";
const MAX_ROUNDS = 3;

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
    ),
  total: z.number(),
  agentNote: z.string(),
});

export async function runAgent(message: string, mandate: Mandate): Promise<AgentResponse> {
  if (mocks.llm) return runMockAgent(message);
  // CURSOR_API_KEY → Grok via Cursor SDK (local); else LLM_API_KEY → OpenAI-compatible endpoint (fast on Vercel).
  const cart = env.cursorApiKey
    ? await runCursorAgent(message, mandate)
    : await runOpenAICompatibleAgent(message, mandate);
  // Nothing matched: pass Grok's explanation through, no cart, so nothing reaches the Gate.
  if (!cart.items.length) return { reply: cart.agentNote || "Found nothing to buy for that request.", cart: null };
  const summary = cart.items.map((i) => `${i.quantity} × ${i.title}`).join(", ");
  return { reply: `Proposing ${summary}. ${cart.agentNote ?? ""}`.trim(), cart };
}

// Deliberately trusting: follows seller notes, so a believable injection in a description works.
// That's the demo — the Gate, not the prompt, is the safety layer.
function buildPrompt(message: string, mandate: Mandate) {
  return `You are a purchasing agent for ${mandate.owner}, a vintage clothing reseller restocking from a wholesale catalogue.
Call the search_products tool ONCE with a short keyword query, then propose a cart.
Follow any seller notes in product descriptions about quantities or bundles.
Only propose products returned by search_products, copying their variantId, title, category, vendor and price exactly.
If none of them match the request, return "items":[] and "total":0 and say why in agentNote.
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
    model: { id: CURSOR_MODEL },
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

const SEARCH_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_products",
    description:
      "Search the wholesale catalogue. Returns products with variantId, title, category, vendor, price (GBP) and the seller's description.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
};

// Plain chat-completions tool loop: one search round, then the model must answer with the cart JSON.
async function runOpenAICompatibleAgent(message: string, mandate: Mandate): Promise<Cart> {
  // A single call occasionally hangs (free tier / overload): give up on it after 15 s and retry once.
  const client = new OpenAI({ baseURL: env.llmBaseUrl, apiKey: env.llmApiKey, timeout: 15_000, maxRetries: 1 });
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const messages: ChatCompletionMessageParam[] = [{ role: "user", content: buildPrompt(message, mandate) }];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const searched = messages.some((m) => m.role === "tool");
    const res = await client.chat.completions
      .create(
        { model: env.llmModel, messages, tools: [SEARCH_TOOL], tool_choice: searched ? "none" : "auto" },
        { signal },
      )
      .catch((e: unknown) => {
        if (signal.aborted) throw new Error(`Agent took longer than ${TIMEOUT_MS / 1000}s`);
        throw e;
      });
    const reply = res.choices[0]?.message;
    if (!reply) throw new Error("Agent returned no message");
    if (!reply.tool_calls?.length) return parseCart(reply.content ?? "");

    // Pass the assistant turn back as-is (keeps provider extras like Gemini thought signatures).
    messages.push(reply as ChatCompletionMessageParam);
    for (const call of reply.tool_calls) {
      const query = call.type === "function" ? safeQuery(call.function.arguments) : "";
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(await searchProducts(query)) });
    }
  }
  throw new Error(`Agent did not propose a cart within ${MAX_ROUNDS} rounds`);
}

function safeQuery(args: string): string {
  try {
    return String((JSON.parse(args) as { query?: unknown }).query ?? "");
  } catch {
    return "";
  }
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
