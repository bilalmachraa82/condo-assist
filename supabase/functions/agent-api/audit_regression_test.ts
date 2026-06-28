// Regression tests — Auditoria 2026-11
// Cobre: A) UUID/STATUS validation, B) list_assistances regressão, C) status filtros,
// D) creates partidos, F) deletes em falta.
//
// Run:  AGENT_API_URL=https://<proj>.supabase.co/functions/v1/agent-api \
//       AGENT_API_KEY=<key> deno test -A audit_regression_test.ts

const URL_BASE = Deno.env.get("AGENT_API_URL") ?? "http://localhost:54321/functions/v1/agent-api";
const KEY = Deno.env.get("AGENT_API_KEY") ?? "";
const BUILDING_ID = Deno.env.get("TEST_BUILDING_ID") ?? "3e812749-16ef-40ba-b98f-a97161ba2cb5";

function h() { return { "x-api-key": KEY, "content-type": "application/json" }; }
async function call(method: string, path: string, body?: unknown) {
  const r = await fetch(`${URL_BASE}${path}`, { method, headers: h(), body: body ? JSON.stringify(body) : undefined });
  let json: any = null; try { json = await r.json(); } catch { /* */ }
  return { status: r.status, body: json };
}

function assertNever500(s: number, label: string) {
  if (s >= 500) throw new Error(`${label}: expected NEVER 500, got ${s}`);
}

// ── A) UUID validation ──
Deno.test("A1 get_quotation with non-UUID → 400, never 500", async () => {
  const r = await call("GET", "/v1/quotations/not-a-uuid");
  assertNever500(r.status, "get_quotation");
  if (r.status !== 400) throw new Error(`expected 400, got ${r.status}`);
});
Deno.test("A2 get_insurance_claim with non-UUID → 400", async () => {
  const r = await call("GET", "/v1/insurance-claims/xxx");
  if (r.status !== 400) throw new Error(`got ${r.status}`);
});
Deno.test("A3 get_assembly with non-UUID → 400", async () => {
  const r = await call("GET", "/v1/assemblies/abc");
  if (r.status !== 400) throw new Error(`got ${r.status}`);
});
Deno.test("A4 get_building with random UUID → 404", async () => {
  const r = await call("GET", "/v1/buildings/00000000-0000-0000-0000-000000000000");
  if (r.status !== 404) throw new Error(`got ${r.status}`);
});

// ── B) list_assistances regressão ──
Deno.test("B1 list_assistances sem status → 200", async () => {
  const r = await call("GET", `/v1/buildings/${BUILDING_ID}/assistances`);
  if (r.status !== 200) throw new Error(`got ${r.status}: ${JSON.stringify(r.body)}`);
});
Deno.test("B2 list_assistances status=open → 200", async () => {
  const r = await call("GET", `/v1/buildings/${BUILDING_ID}/assistances?status=open`);
  if (r.status !== 200) throw new Error(`got ${r.status}: ${JSON.stringify(r.body)}`);
});
Deno.test("B3 list_assistances status inválido → 400, nunca 500", async () => {
  const r = await call("GET", `/v1/buildings/${BUILDING_ID}/assistances?status=quotation_received`);
  assertNever500(r.status, "list_assistances");
  if (r.status !== 400) throw new Error(`got ${r.status}`);
});

// ── C) Filtros de status ──
for (const [tool, path] of [
  ["list_insurance_claims", "/v1/insurance-claims"],
  ["list_assemblies", "/v1/assemblies"],
  ["list_quotations", "/v1/quotations"],
] as const) {
  Deno.test(`C ${tool} status=open → 200`, async () => {
    const r = await call("GET", `${path}?status=open`);
    if (r.status !== 200) throw new Error(`${tool}: got ${r.status}: ${JSON.stringify(r.body)}`);
  });
  Deno.test(`C ${tool} status=lixo → 400 (NUNCA 500)`, async () => {
    const r = await call("GET", `${path}?status=__invalid__`);
    assertNever500(r.status, tool);
    if (r.status !== 400) throw new Error(`${tool}: got ${r.status}`);
  });
}

// ── D) Creates ──
Deno.test("D1 create_email_pendency minimal → 200/201", async () => {
  const r = await call("POST", "/v1/email-pendencies", { title: "regression test " + Date.now(), building_id: BUILDING_ID });
  if (![200, 201].includes(r.status)) throw new Error(`got ${r.status}: ${JSON.stringify(r.body)}`);
  if (r.body?.id) await call("DELETE", `/v1/email-pendencies/${r.body.id}`);
});

Deno.test("D2 create_building_insurance sem coverage_type → 200/201 (default DB)", async () => {
  const r = await call("POST", `/v1/buildings/${BUILDING_ID}/insurances`, { insurer: "regression test" });
  if (![200, 201].includes(r.status)) throw new Error(`got ${r.status}: ${JSON.stringify(r.body)}`);
  if (r.body?.id) await call("DELETE", `/v1/insurances/${r.body.id}`);
});

// ── F) Deletes em falta ──
Deno.test("F1 delete_building (soft) — building inexistente → 404", async () => {
  const r = await call("DELETE", "/v1/buildings/00000000-0000-0000-0000-000000000000");
  if (r.status !== 404) throw new Error(`got ${r.status}`);
});
Deno.test("F2 delete_assistance — id não-UUID → 400", async () => {
  const r = await call("DELETE", "/v1/assistances/not-uuid");
  if (r.status !== 400) throw new Error(`got ${r.status}`);
});
Deno.test("F3 delete_supplier — não-UUID → 400", async () => {
  const r = await call("DELETE", "/v1/suppliers/not-uuid");
  if (r.status !== 400) throw new Error(`got ${r.status}`);
});
Deno.test("F4 delete_follow_up — não-UUID → 400", async () => {
  const r = await call("DELETE", "/v1/follow-ups/not-uuid");
  if (r.status !== 400) throw new Error(`got ${r.status}`);
});
Deno.test("F5 delete_insurance_claim — não-UUID → 400", async () => {
  const r = await call("DELETE", "/v1/insurance-claims/not-uuid");
  if (r.status !== 400) throw new Error(`got ${r.status}`);
});
