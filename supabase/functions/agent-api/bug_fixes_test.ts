// Regression tests for BUG 1/2/3 fixes (lookup_building_by_email, list_email_pendencies status, search alias).
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const BASE = "https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/agent-api";
const MCP_BASE = "https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server";
const KEY = Deno.env.get("EXTERNAL_API_KEY");

function skip() { if (!KEY) { console.warn("no key"); return true; } return false; }

Deno.test("BUG1: lookup_building_by_email finds administrators", async () => {
  if (skip()) return;
  const res = await fetch(`${BASE}/v1/lookup-building-by-email`, {
    method: "POST",
    headers: { "x-api-key": KEY!, "content-type": "application/json" },
    body: JSON.stringify({ email: "jbarata80@hotmail.com" }),
  });
  const body = await res.json();
  assertEquals(res.status, 200, `got ${res.status}: ${JSON.stringify(body)}`);
  assertEquals(body.found, true);
  assertEquals(body.building_code, "175");
  assertEquals(body.match_type, "administrator");
});

Deno.test("BUG1b: lookup returns 404 for unknown email (not 500)", async () => {
  if (skip()) return;
  const res = await fetch(`${BASE}/v1/lookup-building-by-email`, {
    method: "POST",
    headers: { "x-api-key": KEY!, "content-type": "application/json" },
    body: JSON.stringify({ email: "definitely-not-real-xyz@noreply.invalid" }),
  });
  await res.text();
  assertEquals(res.status, 404);
});

Deno.test("BUG2: list_email_pendencies status=open returns 200", async () => {
  if (skip()) return;
  const res = await fetch(`${BASE}/v1/email-pendencies?status=open&limit=50`, { headers: { "x-api-key": KEY! } });
  const body = await res.json();
  assertEquals(res.status, 200, `got ${res.status}: ${JSON.stringify(body).slice(0,300)}`);
  assert(Array.isArray(body.pendencies));
  assert(body.total > 0, "expected open pendencies");
});

Deno.test("BUG2b: list_email_pendencies status=aberto (real enum) works", async () => {
  if (skip()) return;
  const res = await fetch(`${BASE}/v1/email-pendencies?status=aberto&limit=5`, { headers: { "x-api-key": KEY! } });
  const body = await res.json();
  assertEquals(res.status, 200);
  assert(Array.isArray(body.pendencies));
});

Deno.test("BUG2c: list_email_pendencies invalid status returns 400 (not 500)", async () => {
  if (skip()) return;
  const res = await fetch(`${BASE}/v1/email-pendencies?status=lixo`, { headers: { "x-api-key": KEY! } });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.code, "INVALID_STATUS");
  assert(Array.isArray(body.valid_values));
});

Deno.test("BUG3: MCP search accepts 'q' alias", async () => {
  if (skip()) return;
  const res = await fetch(MCP_BASE, {
    method: "POST",
    headers: { "x-api-key": KEY!, "content-type": "application/json", "accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search", arguments: { q: "175" } } }),
  });
  const body = await res.json();
  assertEquals(res.status, 200, `got ${res.status}: ${JSON.stringify(body).slice(0,300)}`);
  assert(!body.result?.isError, `search returned error: ${JSON.stringify(body.result).slice(0,300)}`);
  assert(body.result?.structuredContent?.results, "expected results array");
});

Deno.test("BUG3b: MCP search still accepts 'query'", async () => {
  if (skip()) return;
  const res = await fetch(MCP_BASE, {
    method: "POST",
    headers: { "x-api-key": KEY!, "content-type": "application/json", "accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search", arguments: { query: "175" } } }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assert(!body.result?.isError);
});
