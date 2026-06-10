// Regression tests for agent-api auth header priority + 401 fix.
// Run with: supabase test_edge_functions (Deno test, --allow-net --allow-env)
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const BASE =
  Deno.env.get("AGENT_API_URL") ??
  "https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/agent-api";
const KEY = Deno.env.get("EXTERNAL_API_KEY");

function skipIfNoKey(): boolean {
  if (!KEY) {
    console.warn("⚠️  EXTERNAL_API_KEY not set — skipping live tests");
    return true;
  }
  return false;
}

async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const body = await res.text(); // always consume
  return { status: res.status, body };
}

const ENDPOINTS = [
  "/v1/buildings",
  "/v1/follow-ups",
  "/v1/activity-log",
  "/v1/intervention-types",
];

for (const ep of ENDPOINTS) {
  Deno.test(`GET ${ep} returns 200 with x-api-key (no 401 regression)`, async () => {
    if (skipIfNoKey()) return;
    const { status, body } = await get(ep, { "x-api-key": KEY! });
    assertEquals(status, 200, `Expected 200 for ${ep}, got ${status}: ${body.slice(0, 200)}`);
  });
}

Deno.test("Auth priority: x-api-key wins over Authorization (regression)", async () => {
  if (skipIfNoKey()) return;
  // Send a BAD Authorization header AND the valid x-api-key.
  // If agent-api regresses to reading Authorization first, this will 401.
  const { status, body } = await get("/v1/intervention-types", {
    "x-api-key": KEY!,
    "Authorization": "Bearer this-is-a-wrong-key-on-purpose",
  });
  assertEquals(
    status,
    200,
    `REGRESSION: agent-api is reading Authorization before x-api-key. Got ${status}: ${body.slice(0, 200)}`,
  );
});

Deno.test("Auth: wrong x-api-key (no Authorization) → 401", async () => {
  const { status } = await get("/v1/intervention-types", { "x-api-key": "definitely-wrong" });
  assertEquals(status, 401);
});

Deno.test("Auth: no credentials → 401", async () => {
  const { status } = await get("/v1/intervention-types");
  assertEquals(status, 401);
});
