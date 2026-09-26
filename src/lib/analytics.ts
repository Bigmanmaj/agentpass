// OWNER: P2. PostHog events. No-op (console) until POSTHOG_KEY is set.
import { PostHog } from "posthog-node";
import { env, mocks } from "@/lib/env";

export async function track(event: string, properties: Record<string, unknown> = {}) {
  if (mocks.analytics) {
    console.log(`[analytics] ${event}`, properties);
    return;
  }
  // Serverless: one client per event, flushed before the function returns.
  const client = new PostHog(env.posthogKey, { host: env.posthogHost, flushAt: 1, flushInterval: 0 });
  try {
    client.capture({ distinctId: "sara", event, properties });
    await client.shutdown();
  } catch (e) {
    console.error("[analytics] failed", e);
  }
}
