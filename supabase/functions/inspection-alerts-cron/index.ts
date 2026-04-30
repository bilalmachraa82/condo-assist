import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusRow {
  building_id: string;
  building_code: string;
  building_name: string;
  category_id: string;
  category_key: string;
  category_label: string;
  category_color: string;
  inspection_id: string | null;
  inspection_date: string | null;
  next_due_date: string | null;
  days_until_due: number | null;
  status: "ok" | "due_soon_30" | "due_soon_15" | "overdue" | "missing" | "pending";
  company_name: string | null;
}

const APP_URL = Deno.env.get("APP_BASE_URL") ?? "https://condo-assist.lovable.app";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["inspection_alerts_enabled", "inspection_alerts_recipients", "inspection_overdue_repeat_days"]);

    const map = new Map((settings ?? []).map(s => [s.key, s.value]));
    const enabled = map.get("inspection_alerts_enabled") !== false;
    if (!enabled) {
      return json({ skipped: true, reason: "alerts disabled" });
    }
    const recipients: string[] = Array.isArray(map.get("inspection_alerts_recipients"))
      ? map.get("inspection_alerts_recipients") as string[]
      : ["geral@luvimg.com"];
    const overdueRepeat = Number(map.get("inspection_overdue_repeat_days") ?? 7);

    // Fetch status
    const { data: rows, error } = await supabase
      .from("building_inspection_status")
      .select("*")
      .in("status", ["due_soon_30", "due_soon_15", "overdue", "missing"]);
    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    const newAlerts: StatusRow[] = [];

    for (const r of (rows ?? []) as StatusRow[]) {
      const alertType = r.status === "due_soon_30" ? "30d" :
                        r.status === "due_soon_15" ? "15d" :
                        r.status === "overdue" ? "overdue" : "missing";

      // Idempotency: check log
      const { data: existing } = await supabase
        .from("inspection_alerts_log")
        .select("id, alert_date")
        .eq("building_id", r.building_id)
        .eq("category_id", r.category_id)
        .eq("alert_type", alertType)
        .order("alert_date", { ascending: false })
        .limit(1);

      const last = existing?.[0];
      if (last) {
        if (alertType === "30d" || alertType === "15d") continue; // sent before
        // overdue / missing: respect repeat cadence
        const lastDate = new Date(last.alert_date as string);
        const diffDays = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
        if (diffDays < overdueRepeat) continue;
      }

      newAlerts.push(r);

      // Insert log entries (one per recipient)
      for (const email of recipients) {
        await supabase.from("inspection_alerts_log").insert({
          inspection_id: r.inspection_id,
          building_id: r.building_id,
          category_id: r.category_id,
          alert_type: alertType,
          alert_date: today,
          recipient_email: email,
          metadata: { status: r.status, days_until_due: r.days_until_due },
        });
      }
    }

    if (newAlerts.length === 0) {
      return json({ sent: 0, message: "no new alerts" });
    }

    // Build digest email
    const html = buildDigestHtml(newAlerts);
    const subject = `[Luvimg] ${newAlerts.length} ${newAlerts.length === 1 ? "alerta" : "alertas"} de inspeção`;

    // Send via existing send-email function
    for (const to of recipients) {
      await supabase.functions.invoke("send-email", {
        body: { to, subject, html, email_type: "inspection_alert" },
      });
    }

    // In-app notification (one row per building)
    const buildingsAlerted = new Set(newAlerts.map(a => a.building_id));
    for (const bid of buildingsAlerted) {
      const items = newAlerts.filter(a => a.building_id === bid);
      await supabase.from("notifications").insert({
        assistance_id: items[0].inspection_id ?? null,
        notification_type: "inspection_alert",
        priority: items.some(i => i.status === "overdue") ? "critical" :
                  items.some(i => i.status === "due_soon_15") ? "urgent" : "normal",
        scheduled_for: new Date().toISOString(),
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: {
          building_id: bid,
          building_code: items[0].building_code,
          building_name: items[0].building_name,
          items: items.map(i => ({ category: i.category_label, status: i.status, next_due: i.next_due_date, days: i.days_until_due })),
        },
      }).then(() => {}, () => {}); // best-effort
    }

    return json({ sent: newAlerts.length, recipients });
  } catch (e) {
    console.error("inspection-alerts-cron error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildDigestHtml(alerts: StatusRow[]): string {
  const buckets: Record<string, StatusRow[]> = { overdue: [], due_soon_15: [], due_soon_30: [], missing: [] };
  for (const a of alerts) buckets[a.status]?.push(a);

  const section = (title: string, color: string, list: StatusRow[]) => {
    if (list.length === 0) return "";
    const rows = list.map(r => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600;">${escape(r.building_code)} - ${escape(r.building_name)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">${escape(r.category_label)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">${r.next_due_date ? formatDate(r.next_due_date) : "—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;">${r.days_until_due !== null ? `${r.days_until_due} dias` : "—"}</td>
      </tr>`).join("");
    return `
      <h3 style="color:${color};margin:24px 0 8px;font-size:16px;">${title} (${list.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #eee;border-radius:6px;overflow:hidden;">
        <thead><tr style="background:#f8f9fa;text-align:left;">
          <th style="padding:8px 10px;">Edifício</th>
          <th style="padding:8px 10px;">Categoria</th>
          <th style="padding:8px 10px;">Próxima</th>
          <th style="padding:8px 10px;text-align:right;">Restante</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  };

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f5f7;padding:20px;color:#222;">
    <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:10px;padding:24px;box-shadow:0 2px 6px rgba(0,0,0,0.06);">
      <h2 style="margin:0 0 4px;color:#0f172a;">🛡️ Alertas de Inspeção</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:13px;">Resumo automático gerado em ${formatDate(new Date().toISOString().slice(0,10))}.</p>
      ${section("⛔ Vencidos", "#dc2626", buckets.overdue)}
      ${section("❓ Sem registo", "#475569", buckets.missing)}
      ${section("🔥 A vencer em 15 dias", "#ea580c", buckets.due_soon_15)}
      ${section("⏳ A vencer em 30 dias", "#d97706", buckets.due_soon_30)}
      <div style="margin-top:24px;text-align:center;">
        <a href="${APP_URL}/inspecoes" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Abrir painel de inspeções</a>
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
