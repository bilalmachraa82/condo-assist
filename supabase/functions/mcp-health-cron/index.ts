// MCP health-check cron — runs the 6 critical agent-api endpoints with the
// real EXTERNAL_API_KEY, persists results in `mcp_health_checks`, and emails
// `geral@luvimg.com` when a regression is detected (transition from OK → fail).
//
// Scheduled via pg_cron (see migration / dashboard).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXTERNAL_API_KEY = Deno.env.get("EXTERNAL_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ALERT_TO = "geral@luvimg.com";
const ALERT_FROM = "Condo Monitor <geral@luvimg.com>";

const AGENT_API = `${SUPABASE_URL}/functions/v1/agent-api`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Probe = {
  tool: string;
  path: string; // agent-api REST path
  countKey?: string; // optional key in response to count records
};

const PROBES: Probe[] = [
  { tool: "health_check", path: "/v1/health" },
  { tool: "list_buildings", path: "/v1/buildings", countKey: "items" },
  { tool: "list_intervention_types", path: "/v1/intervention-types", countKey: "items" },
  // list_assistances is nested under a building → resolved dynamically below
  { tool: "list_assistances", path: "__DYNAMIC_LIST_ASSISTANCES__", countKey: "items" },
  { tool: "list_follow_ups", path: "/v1/follow-ups?limit=1", countKey: "items" },
  { tool: "list_activity_log", path: "/v1/activity-log?limit=1", countKey: "items" },
];

async function resolveAssistancesPath(): Promise<string | null> {
  try {
    const res = await fetch(`${AGENT_API}/v1/buildings`, { headers: { "x-api-key": EXTERNAL_API_KEY } });
    if (!res.ok) return null;
    const json = await res.json();
    const first = Array.isArray(json?.items) ? json.items[0] : null;
    if (!first?.id) return null;
    return `/v1/buildings/${first.id}/assistances?limit=1`;
  } catch { return null; }
}

type Result = {
  tool: string;
  status: "ok" | "fail";
  http_status: number | null;
  latency_ms: number;
  error: string | null;
  response_size: number | null;
};

async function probe(p: Probe): Promise<Result> {
  const started = performance.now();
  try {
    const res = await fetch(`${AGENT_API}${p.path}`, {
      headers: { "x-api-key": EXTERNAL_API_KEY },
    });
    const text = await res.text();
    const latency = Math.round(performance.now() - started);
    if (!res.ok) {
      return {
        tool: p.tool,
        status: "fail",
        http_status: res.status,
        latency_ms: latency,
        error: text.slice(0, 500),
        response_size: text.length,
      };
    }
    let size: number | null = text.length;
    if (p.countKey) {
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json?.[p.countKey])) size = json[p.countKey].length;
      } catch { /* ignore */ }
    }
    return {
      tool: p.tool,
      status: "ok",
      http_status: res.status,
      latency_ms: latency,
      error: null,
      response_size: size,
    };
  } catch (e) {
    return {
      tool: p.tool,
      status: "fail",
      http_status: null,
      latency_ms: Math.round(performance.now() - started),
      error: String((e as Error)?.message ?? e).slice(0, 500),
      response_size: null,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!EXTERNAL_API_KEY) {
    return new Response(JSON.stringify({ error: "EXTERNAL_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const runId = crypto.randomUUID();

  const dynamicAssistances = await resolveAssistancesPath();
  const probes = PROBES.map(p =>
    p.path === "__DYNAMIC_LIST_ASSISTANCES__"
      ? (dynamicAssistances ? { ...p, path: dynamicAssistances } : null)
      : p
  ).filter(Boolean) as Probe[];

  const results = await Promise.all(probes.map(probe));

  // Persist all results
  const rows = results.map(r => ({
    run_id: runId,
    tool_name: r.tool,
    status: r.status,
    http_status: r.http_status,
    latency_ms: r.latency_ms,
    error: r.error,
    response_size: r.response_size,
  }));
  const { error: insertErr } = await supabase.from("mcp_health_checks").insert(rows);
  if (insertErr) console.error("insert failed", insertErr);

  const failures = results.filter(r => r.status === "fail");

  // Dedup alert: only email if the immediately previous run had 0 failures.
  let shouldAlert = false;
  if (failures.length > 0 && RESEND_API_KEY) {
    const { data: prev } = await supabase
      .from("mcp_health_checks")
      .select("run_id, status, checked_at")
      .neq("run_id", runId)
      .order("checked_at", { ascending: false })
      .limit(20);
    const prevRunId = prev?.[0]?.run_id;
    const prevFails = prev?.filter(r => r.run_id === prevRunId && r.status === "fail").length ?? 0;
    shouldAlert = prevFails === 0; // last run was clean → this is a NEW failure
  }

  if (shouldAlert) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const rowsHtml = failures.map(f =>
        `<tr><td>${f.tool}</td><td>${f.http_status ?? "—"}</td><td>${f.latency_ms}ms</td><td><code>${(f.error ?? "").replace(/</g, "&lt;")}</code></td></tr>`
      ).join("");
      await resend.emails.send({
        from: ALERT_FROM,
        to: [ALERT_TO],
        subject: `[Condo] MCP health-check falhou: ${failures.length} tool(s)`,
        html: `
          <h2>MCP health-check — falha detectada</h2>
          <p>Run <code>${runId}</code> · ${new Date().toISOString()}</p>
          <table border="1" cellpadding="6" cellspacing="0">
            <thead><tr><th>Tool</th><th>HTTP</th><th>Latência</th><th>Erro</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <p><a href="https://condo-assist.lovable.app/mcp-health">Abrir dashboard</a></p>
        `,
      });
    } catch (e) {
      console.error("alert email failed", e);
    }
  }

  return new Response(JSON.stringify({
    run_id: runId,
    total: results.length,
    failures: failures.length,
    alerted: shouldAlert,
    results,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
