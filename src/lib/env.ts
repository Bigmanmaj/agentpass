// SHARED. Each integration falls back to a mock when its keys are missing,
// so everyone can run the full flow on their own laptop from minute one.

export const env = {
  // LLM: any OpenAI-compatible endpoint (xAI direct or Vercel AI Gateway)
  llmBaseUrl: process.env.LLM_BASE_URL || "https://api.x.ai/v1",
  llmApiKey: process.env.LLM_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "grok-4.7",
  // Cursor SDK: runs Grok with a crsr_ key from the Cursor dashboard (takes priority over LLM_*)
  cursorApiKey: process.env.CURSOR_API_KEY || "",

  shopifyShop: process.env.SHOPIFY_SHOP || "",
  shopifyClientId: process.env.SHOPIFY_CLIENT_ID || "",
  shopifyClientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
  shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2026-07",

  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  posthogKey: process.env.POSTHOG_KEY || "",
  posthogHost: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",

  tavilyKey: process.env.TAVILY_API_KEY || "",

  agentpassSecret: process.env.AGENTPASS_SECRET || "dev-only-secret-change-me-please-32chars",
};

export const mocks = {
  llm: !env.llmApiKey && !env.cursorApiKey,
  shopify: !env.shopifyShop || !env.shopifyClientId,
  db: !env.supabaseUrl,
  analytics: !env.posthogKey,
  market: !env.tavilyKey,
};
