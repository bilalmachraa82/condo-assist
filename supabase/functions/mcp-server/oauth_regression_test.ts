// Regression tests for mcp-server OAuth 2.1 + x-api-key auth.
// Run with: supabase test_edge_functions (Deno test, --allow-net --allow-env)
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const BASE = Deno.env.get("MCP_SERVER_URL") ??
  "https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server";
const KEY = Deno.env.get("EXTERNAL_API_KEY");

function skipIfNoKey(): boolean {
  if (!KEY) {
    console.warn("⚠️  EXTERNAL_API_KEY not set — skipping live tests");
    return true;
  }
  return false;
}

async function post(path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = text;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { status: res.status, text, json };
}

async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const text = await res.text();
  let json: unknown = text;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { status: res.status, text, json };
}

Deno.test("GET /info is public and advertises OAuth", async () => {
  const { status, json } = await get("/info");
  assertEquals(status, 200);
  const info = json as Record<string, unknown>;
  assertEquals(info.name, "condo-assist-mcp");
  assertEquals(info.version, "1.4.2");
  assertEquals(info.tools, 133);
  const auth = info.auth as Record<string, unknown>;
  assert(Array.isArray(auth.methods));
  assert(auth.methods.includes("x-api-key"));
  assert(auth.methods.includes("bearer-oauth"));
  assert(typeof auth.oauth_issuer === "string");
  assert(typeof auth.oauth_protected_resource === "string");
});

Deno.test("GET /.well-known/oauth-protected-resource returns metadata", async () => {
  const { status, json } = await get("/.well-known/oauth-protected-resource");
  assertEquals(status, 200);
  const meta = json as Record<string, unknown>;
  assert(typeof meta.resource === "string");
  assert(Array.isArray(meta.authorization_servers));
  assert(Array.isArray(meta.bearer_methods));
  assertEquals(meta.bearer_header_name, "Authorization");
  assert(typeof meta.authorization_server_metadata === "string");
});

Deno.test("debug diagnostics reject unauthenticated access", async () => {
  for (const path of ["/debug/tools", "/debug/recent", "/debug/correlation/unknown"]) {
    const { status, json } = await get(path);
    assertEquals(status, 401, `${path} must not be public`);
    assertEquals((json as any)?.error, "Unauthorized");
  }
});

Deno.test("POST tools/list with x-api-key returns 200", async () => {
  if (skipIfNoKey()) return;
  const { status, json } = await post("", { "x-api-key": KEY! }, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });
  assertEquals(status, 200);
  const result = (json as any)?.result;
  assert(result && Array.isArray(result.tools), `Expected tools array, got: ${JSON.stringify(json).slice(0, 200)}`);
  assert(result.tools.length > 0);
});

Deno.test("POST tools/list without auth returns 401", async () => {
  const { status, json } = await post("", {}, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });
  assertEquals(status, 401);
  assertEquals((json as any)?.error, "Unauthorized. Provide x-api-key header or a valid OAuth Bearer token.");
});

Deno.test("POST tools/list with wrong x-api-key returns 401", async () => {
  const { status } = await post("", { "x-api-key": "definitely-wrong" }, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });
  assertEquals(status, 401);
});

Deno.test("POST tools/list with invalid bearer returns 401", async () => {
  const { status } = await post("", { "Authorization": "Bearer invalid-token" }, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });
  assertEquals(status, 401);
});

Deno.test("x-api-key takes precedence over invalid Authorization (regression)", async () => {
  if (skipIfNoKey()) return;
  const { status, json } = await post("", {
    "x-api-key": KEY!,
    "Authorization": "Bearer this-is-a-wrong-key-on-purpose",
  }, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });
  assertEquals(status, 200, `REGRESSION: mcp-server read Authorization before x-api-key. Got ${status}: ${JSON.stringify(json).slice(0, 200)}`);
});
