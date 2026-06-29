// Write-path audit — v1.4.1 (Jun 2026)
// Cobre ciclo create → update → delete por família + validação de enum/uuid.
// Garante 200 em input válido e 400 estruturado (nunca 500) em input inválido.
//
// Run:  AGENT_API_URL=https://<proj>.supabase.co/functions/v1/agent-api \
//       AGENT_API_KEY=<key> TEST_BUILDING_ID=<uuid> TEST_ASSISTANCE_ID=<uuid> \
//       deno test -A write_audit_test.ts

const URL_BASE = Deno.env.get("AGENT_API_URL") ?? "http://localhost:54321/functions/v1/agent-api";
const KEY = Deno.env.get("AGENT_API_KEY") ?? "";
const BUILDING_ID = Deno.env.get("TEST_BUILDING_ID") ?? "2a939da8-46d9-4cd3-8e31-8aa34df88bbc";
const ASSISTANCE_ID = Deno.env.get("TEST_ASSISTANCE_ID") ?? "d945f88f-aee6-4e44-adb4-e35c9cfbfc2d";

function h() { return { "x-api-key": KEY, "content-type": "application/json" }; }
async function call(method: string, path: string, body?: unknown) {
  const r = await fetch(`${URL_BASE}${path}`, { method, headers: h(), body: body ? JSON.stringify(body) : undefined });
  let json: any = null; try { json = await r.json(); } catch { /* */ }
  return { status: r.status, body: json };
}
function assertNever500(s: number, label: string) {
  if (s >= 500) throw new Error(`${label}: expected NEVER 500, got ${s}`);
}

// ── Enum validation (root cause of opaque 500s) ──
Deno.test("update_assistance status='ac' → 400 INVALID_ENUM with allowed_values", async () => {
  const r = await call("PATCH", `/v1/assistances/${ASSISTANCE_ID}`, { status: "ac" });
  assertNever500(r.status, "update_assistance");
  if (r.status !== 400) throw new Error(`got ${r.status}`);
  if (r.body?.code !== "INVALID_ENUM") throw new Error(`expected INVALID_ENUM, got ${r.body?.code}`);
  if (!Array.isArray(r.body?.allowed_values)) throw new Error("missing allowed_values[]");
  if (!r.body.allowed_values.includes("scheduled")) throw new Error("allowed_values incomplete");
});

Deno.test("update_assistance priority='lol' → 400 INVALID_ENUM", async () => {
  const r = await call("PATCH", `/v1/assistances/${ASSISTANCE_ID}`, { priority: "lol" });
  if (r.status !== 400 || r.body?.code !== "INVALID_ENUM") throw new Error(`got ${r.status} ${JSON.stringify(r.body)}`);
});

// ── create_building_insurance: ciclo CRUD ──
Deno.test("building_insurance create→update→delete (default coverage_type aplicado)", async () => {
  const c = await call("POST", `/v1/buildings/${BUILDING_ID}/insurances`, { insurer: "audit-test" });
  if (![200, 201].includes(c.status)) throw new Error(`create failed ${c.status}: ${JSON.stringify(c.body)}`);
  if (c.body.coverage_type !== "multirisco") throw new Error("DB default coverage_type='multirisco' not applied");
  const id = c.body.id;
  const u = await call("PATCH", `/v1/insurances/${id}`, { insurer: "audit-test-updated" });
  if (u.status !== 200) throw new Error(`update failed ${u.status}`);
  const d = await call("DELETE", `/v1/insurances/${id}`);
  if (d.status !== 200) throw new Error(`delete failed ${d.status}`);
});

// ── create_follow_up: ciclo + missing fields ──
Deno.test("follow_up create→delete com input mínimo válido", async () => {
  const c = await call("POST", "/v1/follow-ups", {
    assistance_id: ASSISTANCE_ID,
    follow_up_type: "work_reminder",
    scheduled_for: new Date(Date.now() + 24 * 3600_000).toISOString(),
  });
  if (![200, 201].includes(c.status)) throw new Error(`create failed ${c.status}: ${JSON.stringify(c.body)}`);
  const d = await call("DELETE", `/v1/follow-ups/${c.body.id}`);
  if (d.status !== 200) throw new Error(`delete failed ${d.status}`);
});

Deno.test("create_follow_up sem campos obrigatórios → 400, nunca 500", async () => {
  const r = await call("POST", "/v1/follow-ups", {});
  assertNever500(r.status, "create_follow_up");
  if (r.status !== 400) throw new Error(`got ${r.status}`);
});

// ── create_email_pendency continua verde ──
Deno.test("email_pendency create→update→delete", async () => {
  const c = await call("POST", "/v1/email-pendencies", { title: `audit ${Date.now()}`, building_id: BUILDING_ID });
  if (![200, 201].includes(c.status)) throw new Error(`create failed ${c.status}: ${JSON.stringify(c.body)}`);
  const u = await call("PATCH", `/v1/email-pendencies/${c.body.id}`, { status: "aguarda_resposta" });
  if (u.status !== 200) throw new Error(`update failed ${u.status}`);
  const d = await call("DELETE", `/v1/email-pendencies/${c.body.id}`);
  if (d.status !== 200) throw new Error(`delete failed ${d.status}`);
});

// ── delete_building real soft-delete ──
Deno.test("delete_building é soft-delete real (is_active=false na resposta)", async () => {
  const code = `AUDIT${Date.now()}`;
  const c = await call("POST", "/v1/buildings", { code, name: "audit-tmp", address: "x", postal_code: "0000-000" });
  if (![200, 201].includes(c.status)) throw new Error(`create failed ${c.status}: ${JSON.stringify(c.body)}`);
  const d = await call("DELETE", `/v1/buildings/${c.body.id}`);
  if (d.status !== 200) throw new Error(`delete failed ${d.status}`);
  if (d.body?.is_active !== false) throw new Error("delete_building não devolveu is_active=false");
  if (d.body?.soft !== true) throw new Error("delete_building não marca soft=true");
});

// ── Inputs inválidos sempre 400 (nunca 500) — sanity sweep ──
for (const [name, method, path, body] of [
  ["delete_building non-uuid", "DELETE", "/v1/buildings/not-uuid", undefined],
  ["delete_assistance non-uuid", "DELETE", "/v1/assistances/not-uuid", undefined],
  ["delete_supplier non-uuid", "DELETE", "/v1/suppliers/not-uuid", undefined],
  ["delete_follow_up non-uuid", "DELETE", "/v1/follow-ups/not-uuid", undefined],
  ["delete_insurance_claim non-uuid", "DELETE", "/v1/insurance-claims/not-uuid", undefined],
] as const) {
  Deno.test(`${name} → 400, nunca 500`, async () => {
    const r = await call(method, path, body);
    assertNever500(r.status, name);
    if (r.status !== 400) throw new Error(`got ${r.status}`);
  });
}
