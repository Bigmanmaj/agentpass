// OWNER: P2.
import { expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

it("reports mock/live flags and never leaks key values", async () => {
  const body = await (await GET(new Request("http://test/api/health?probe=1"))).json();
  expect(body.live).toHaveProperty("shopify");
  expect(body.shopify.ok).toBe(true);
  expect(JSON.stringify(body)).not.toMatch(/crsr_|shpss_|secret-change-me/);
});
