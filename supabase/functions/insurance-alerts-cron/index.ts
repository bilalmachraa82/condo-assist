import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsuranceStatusRow {
  building_id: string;
  building_code: string;
  building_name: string;
  insurance_id: string | null;
  policy_number: string | null;
  insurer: string | null;
  broker: string | null;
  contact: string | null;
  coverage_type: string | null;
  fractions_included: string | null;
  observations: string | null;
  renewal_date: string | null;
  days_until_renewal: number | null;
  status: "ok" | "due_soon_30" | "overdue" | "missing";
}

const APP_URL = Deno.env.get("APP_BASE_URL") ?? "https://condo-assist.lovable.app";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["insurance_alerts_enabled", "insurance_alerts_recipients", "insurance_overdue_repeat_days"]);

    const map = new Map((settings ?? []).map(s => [s.key, s.value]));
    const enabled = map.get("insurance_alerts_enabled") !== false;
    if (!enabled) return json({ skipped: true, reason: "alerts disabled" });

    const recipients: string[] = Array.isArray(map.get("insurance_alerts_recipients"))
      ? map.get("insurance_alerts_recipients") as string[]
      : ["geral@luvimg.com"];
    const overdueRepeat = Number(map.get("insurance_overdue_repeat_days") ?? 7);

    const { data: rows, error } = await supabase
      .from("building_insurance_status")
      .select("*")
      .in("status", ["due_soon_30", "overdue"]);
    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    const newAlerts: InsuranceStatusRow[] = [];

    for (const r of (rows ?? []) as InsuranceStatusRow[]) {
      const alertType = r.status === "due_soon_30" ? "30d" : "overdue";

      const { data: existing } = await supabase
        .from("insurance_alerts_log")
        .select("id, alert_date")
        .eq("building_id", r.building_id)
        .eq("alert_type", alertType)
        .order("alert_date", { ascending: false })
        .limit(1);

      const last = existing?.[0];
      if (last) {
        if (alertType === "30d") continue;
        const lastDate = new Date(last.alert_date as string);
        const diffDays = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
        if (diffDays < overdueRepeat) continue;
      }

      newAlerts.push(r);

      for (const email of recipients) {
        await supabase.from("insurance_alerts_log").insert({
          insurance_id: r.insurance_id,
          building_id: r.building_id,
          alert_type: alertType,
          alert_date: today,
          recipient_email: email,
          metadata: { status: r.status, days_until_renewal: r.days_until_renewal, policy: r.policy_number, insurer: r.insurer },
        });
      }
    }

    if (newAlerts.length === 0) return json({ sent: 0, message: "no new alerts" });

    const html = buildDigestHtml(newAlerts);
    const subject = `[Luvimg] ${newAlerts.length} ${newAlerts.length === 1 ? "seguro requer atenção" : "seguros requerem atenção"}`;

    for (const to of recipients) {
      await supabase.functions.invoke("send-email", {
        body: { to, subject, html, email_type: "insurance_alert" },
      });
    }

    // In-app notification per building
    const buildingsAlerted = new Set(newAlerts.map(a => a.building_id));
    for (const bid of buildingsAlerted) {
      const items = newAlerts.filter(a => a.building_id === bid);
      await supabase.from("notifications").insert({
        assistance_id: null,
        notification_type: "insurance_alert",
        priority: items.some(i => i.status === "overdue") ? "critical" : "normal",
        scheduled_for: new Date().toISOString(),
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: {
          building_id: bid,
          building_code: items[0].building_code,
          building_name: items[0].building_name,
          items: items.map(i => ({
            policy: i.policy_number,
            insurer: i.insurer,
            status: i.status,
            renewal: i.renewal_date,
            days: i.days_until_renewal,
          })),
        },
      }).then(() => {}, () => {});
    }

    return json({ sent: newAlerts.length, recipients });
  } catch (e) {
    console.error("insurance-alerts-cron error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function coverageLabel(t: string | null) {
  if (t === "multirisco") return "Multirriscos";
  if (t === "partes_comuns") return "Partes Comuns";
  return "Outro";
}

function buildDigestHtml(alerts: InsuranceStatusRow[]): string {
  const buckets: Record<string, InsuranceStatusRow[]> = { overdue: [], due_soon_30: [] };
  for (const a of alerts) buckets[a.status]?.push(a);

  const section = (title: string, color: string, list: InsuranceStatusRow[]) => {
    if (list.length === 0) return "";
    const rows = list.map(r => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;vertical-align:top;">
          <div style="font-weight:600;color:#0f172a;">${escape(r.building_code)} - ${escape(r.building_name)}</div>
          ${r.fractions_included ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">Fracções: ${escape(r.fractions_included)}</div>` : ""}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;vertical-align:top;">
          <div style="font-weight:600;">${escape(r.insurer ?? "—")}</div>
          <div style="font-size:11px;color:#64748b;">${escape(coverageLabel(r.coverage_type))}</div>
          ${r.broker ? `<div style="font-size:11px;color:#94a3b8;">Mediador: ${escape(r.broker)}</div>` : ""}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;vertical-align:top;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:12px;">
          ${escape(r.policy_number ?? "—")}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;vertical-align:top;font-size:11px;color:#475569;">
          ${r.contact ? escape(r.contact).replace(/\/\//g, "<br/>") : "—"}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;vertical-align:top;text-align:right;white-space:nowrap;">
          <div style="font-weight:600;">${r.renewal_date ? formatDate(r.renewal_date) : "—"}</div>
          <div style="font-size:11px;color:${color};font-weight:600;margin-top:2px;">
            ${r.status === "overdue"
              ? `Vencido há ${Math.abs(r.days_until_renewal ?? 0)}d`
              : `Em ${r.days_until_renewal ?? 0}d`}
          </div>
        </td>
      </tr>`).join("");
    return `
      <h3 style="color:${color};margin:24px 0 8px;font-size:16px;">${title} (${list.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #eee;border-radius:6px;overflow:hidden;">
        <thead><tr style="background:#f8f9fa;text-align:left;">
          <th style="padding:8px 10px;">Edifício</th>
          <th style="padding:8px 10px;">Companhia</th>
          <th style="padding:8px 10px;">Apólice</th>
          <th style="padding:8px 10px;">Contacto</th>
          <th style="padding:8px 10px;text-align:right;">Renovação</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  };

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f5f7;padding:20px;color:#222;">
    <div style="max-width:760px;margin:0 auto;background:#fff;border-radius:10px;padding:24px;box-shadow:0 2px 6px rgba(0,0,0,0.06);">
      <h2 style="margin:0 0 4px;color:#0f172a;">📑 Alertas de Seguros</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:13px;">Resumo automático gerado em ${formatDate(new Date().toISOString().slice(0,10))}. Use os dados abaixo para validar e accionar a renovação.</p>
      ${section("⛔ Apólices vencidas", "#dc2626", buckets.overdue)}
      ${section("⏳ A renovar nos próximos 30 dias", "#d97706", buckets.due_soon_30)}
      <div style="margin-top:24px;text-align:center;">
        <a href="${APP_URL}/seguros" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Abrir painel de seguros</a>
      </div>
      <p style="margin-top:24px;color:#94a3b8;font-size:12px;text-align:center;">
        Email automático Luvimg · geral@luvimg.com
      </p>
    </div>
  </body></html>`;
}

function escape(s: string) { return s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!)); }
function formatDate(iso: string) {
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
