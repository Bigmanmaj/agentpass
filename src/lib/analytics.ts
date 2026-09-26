// OWNER: P2. PostHog events. No-op (console) until POSTHOG_KEY is set.
import { mocks } from "@/lib/env";

export async function track(event: string, properties: Record<string, unknown> = {}) {
  if (mocks.analytics) {
    console.log(`[analytics] ${event}`, properties);
    return;
  }
  // TODO(P2): posthog-node capture({ distinctId: "sara", event, properties }) then await shutdown()
}
