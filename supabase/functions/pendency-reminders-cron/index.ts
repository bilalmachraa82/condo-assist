import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_BASE_URL") ?? "https://condo-assist.lovable.app";
const RECIPIENT = "geral@luvimg.com";

interface ReminderRow {
  id: string;
  pendency_id: string;
  reminder_type: string;
  scheduled_for: string;
  attempt_count: number;
  max_attempts: number;
  note: string | null;
  metadata: Record<string, unknown> | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: due, error } = await supabase
      .from("pendency_reminders")
      .select("id, pendency_id, reminder_type, scheduled_for, attempt_count, max_attempts, note, metadata")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .limit(200);
    if (error) throw error;

    const rows = (due ?? []) as ReminderRow[];
    if (rows.length === 0) return json({ processed: 0, message: "no due reminders" });

    let sent = 0, skipped = 0, failed = 0;
    const errors: string[] = [];

    for (const r of rows) {
      const { data: p } = await supabase
        .from("email_pendencies")
        .select(`
          id, title, description, subject, status, priority, email_sent_at, last_activity_at, created_at,
          buildings:building_id (code, name),
          assistances:assistance_id (assistance_number, title),
          suppliers:supplier_id (name, email)
        `)
        .eq("id", r.pendency_id)
        .maybeSingle();

      if (!p) {
        await supabase.from("pendency_reminders").update({
          status: "cancelled",
          metadata: { ...(r.metadata ?? {}), skipped_reason: "pendency_not_found" },
        }).eq("id", r.id);
        skipped++; continue;
      }

      // Skip & cancel if pendency is closed or no longer awaits a reply (for SLA auto)
      if (p.status === "resolvido" || p.status === "cancelado") {
        await supabase.from("pendency_reminders").update({
          status: "cancelled",
          metadata: { ...(r.metadata ?? {}), skipped_reason: `pendency_${p.status}` },
        }).eq("id", r.id);
        skipped++; continue;
      }
      if (r.reminder_type === "sla_auto" && p.status !== "aguarda_resposta") {
        await supabase.from("pendency_reminders").update({
          status: "cancelled",
          metadata: { ...(r.metadata ?? {}), skipped_reason: `status_changed_${p.status}` },
        }).eq("id", r.id);
        skipped++; continue;
      }

      const b: any = Array.isArray(p.buildings) ? p.buildings[0] : p.buildings;
      const a: any = Array.isArray(p.assistances) ? p.assistances[0] : p.assistances;
      const s: any = Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers;
      const buildingLabel = b ? `${b.code} - ${b.name}` : "Sem edifício";
      const refTs = p.email_sent_at ?? p.last_activity_at ?? p.created_at;
      const ageDays = Math.max(0, Math.floor((Date.now() - new Date(refTs).getTime()) / 86400000));
      const attempt = (r.attempt_count ?? 0) + 1;

      const subject = `🔔 Pendência: ${p.title} — ${buildingLabel}${attempt > 1 ? ` (tentativa ${attempt})` : ""}`;
      const html = buildHtml({
        pendency: p, buildingLabel,
        assistanceLabel: a ? `#${a.assistance_number} ${a.title}` : "—",
        supplierLabel: s ? `${s.name}${s.email ? ` (${s.email})` : ""}` : "—",
        note: r.note ?? "",
        ageDays, attempt, maxAttempts: r.max_attempts, type: r.reminder_type,
      });

      try {
        const { error: emailErr } = await supabase.functions.invoke("send-email", {
          body: { to: RECIPIENT, subject, html, email_type: "pendency_reminder" },
        });
        if (emailErr) throw emailErr;

        const isFinal = attempt >= r.max_attempts;
        await supabase.from("pendency_reminders").update({
          status: isFinal ? "sent" : "pending",
          attempt_count: attempt,
          sent_at: new Date().toISOString(),
          // For SLA auto: re-schedule next attempt 2 days later if not exhausted
          scheduled_for: isFinal
            ? r.scheduled_for
            : new Date(Date.now() + 2 * 86400000).toISOString(),
        }).eq("id", r.id);

        // Append note to pendency timeline
        await supabase.from("email_pendency_notes").insert({
          pendency_id: r.pendency_id,
          body: `🔔 Lembrete enviado (${r.reminder_type === "sla_auto" ? "SLA auto" : "manual"}) — tentativa ${attempt}/${r.max_attempts}${r.note ? `\n${r.note}` : ""}`,
          note_type: "system",
          metadata: { reminder_id: r.id, attempt, type: r.reminder_type },
        });
        sent++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${r.id}: ${msg}`);
        const isFinal = attempt >= r.max_attempts;
        await supabase.from("pendency_reminders").update({
          status: isFinal ? "failed" : "pending",
          attempt_count: attempt,
          metadata: { ...(r.metadata ?? {}), last_error: msg },
          scheduled_for: isFinal ? r.scheduled_for : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }).eq("id", r.id);
        failed++;
      }
    }

    return json({ processed: rows.length, sent, skipped, failed, errors });
  } catch (e) {
    console.error("pendency-reminders-cron error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escape(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

function priorityChip(priority: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    critical: { label: "Crítica", bg: "#fee2e2", color: "#991b1b" },
    urgent: { label: "Urgente", bg: "#fef3c7", color: "#92400e" },
    normal: { label: "Normal", bg: "#e0e7ff", color: "#3730a3" },
  };
  const p = map[priority] ?? map.normal;
  return `<span style="background:${p.bg};color:${p.color};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${p.label}</span>`;
}

function buildHtml(args: {
  pendency: any; buildingLabel: string; assistanceLabel: string; supplierLabel: string;
  note: string; ageDays: number; attempt: number; maxAttempts: number; type: string;
}) {
  const { pendency, buildingLabel, assistanceLabel, supplierLabel, note, ageDays, attempt, maxAttempts, type } = args;
  const typeLabel = type === "sla_auto" ? "Lembrete automático SLA" : "Lembrete manual";
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f5f7;padding:20px;color:#222;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:10px;padding:24px;box-shadow:0 2px 6px rgba(0,0,0,0.06);">
      <div style="display:flex;align-items:center;gap:8px;margin:0 0 8px;">
        <span style="font-size:22px;">🔔</span>
        <h2 style="margin:0;color:#0f172a;font-size:18px;">${typeLabel}</h2>
      </div>
      <p style="margin:0 0 18px;color:#64748b;font-size:13px;">Pendência de email · tentativa ${attempt}/${maxAttempts}</p>

      ${note ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;margin-bottom:18px;">
        <div style="font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px;">Nota</div>
        <div style="color:#451a03;font-size:14px;">${escape(note)}</div>
      </div>` : ""}

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:140px;">Título</td><td style="padding:6px 0;font-weight:600;">${escape(pendency.title)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Edifício</td><td style="padding:6px 0;">${escape(buildingLabel)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Fornecedor</td><td style="padding:6px 0;">${escape(supplierLabel)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Assistência</td><td style="padding:6px 0;">${escape(assistanceLabel)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Estado</td><td style="padding:6px 0;">${escape(pendency.status)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Prioridade</td><td style="padding:6px 0;">${priorityChip(pendency.priority)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Sem resposta há</td><td style="padding:6px 0;">${ageDays} ${ageDays === 1 ? "dia" : "dias"}</td></tr>
      </table>

      ${pendency.description ? `<div style="margin-top:16px;padding:12px 14px;background:#f8fafc;border-radius:8px;font-size:13px;color:#334155;">${escape(pendency.description)}</div>` : ""}

      <div style="margin-top:24px;text-align:center;">
        <a href="${APP_URL}/pendencias-email" style="background:#3b82f6;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Abrir pendência</a>
      </div>
      <p style="margin-top:24px;color:#94a3b8;font-size:12px;text-align:center;">Email automático Luvimg · geral@luvimg.com</p>
    </div>
  </body></html>`;
}
