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
  assistance_id: string;
  scheduled_for: string;
  metadata: { note?: string | null; preset?: string | null } | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch due manual reminders
    const { data: due, error: fetchErr } = await supabase
      .from("follow_up_schedules")
      .select("id, assistance_id, scheduled_for, metadata")
      .eq("follow_up_type", "manual_reminder")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .limit(200);
    if (fetchErr) throw fetchErr;

    const rows = (due ?? []) as ReminderRow[];
    if (rows.length === 0) {
      return json({ processed: 0, message: "no due manual reminders" });
    }

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const r of rows) {
      // Load assistance + building
      const { data: assistance } = await supabase
        .from("assistances")
        .select("id, assistance_number, title, description, priority, status, created_at, building_id, intervention_type_id")
        .eq("id", r.assistance_id)
        .maybeSingle();

      if (!assistance) {
        await supabase
          .from("follow_up_schedules")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: { ...(r.metadata ?? {}), skipped_reason: "assistance_not_found" },
          })
          .eq("id", r.id);
        skipped++;
        continue;
      }

      // Skip if assistance is already closed
      if (assistance.status === "completed" || assistance.status === "cancelled") {
        await supabase
          .from("follow_up_schedules")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: { ...(r.metadata ?? {}), skipped_reason: `status_${assistance.status}` },
          })
          .eq("id", r.id);
        skipped++;
        continue;
      }

      const [{ data: building }, { data: intervention }] = await Promise.all([
        supabase.from("buildings").select("code, name").eq("id", assistance.building_id).maybeSingle(),
        supabase.from("intervention_types").select("name").eq("id", assistance.intervention_type_id).maybeSingle(),
      ]);

      const buildingLabel = building ? `${building.code} - ${building.name}` : "Sem edifício";
      const note = (r.metadata?.note ?? "").toString().trim();
      const ageDays = Math.max(0, Math.floor((Date.now() - new Date(assistance.created_at).getTime()) / 86400000));

      const subject = `🔔 Lembrete: #${assistance.assistance_number ?? ""} ${assistance.title} — ${buildingLabel}`;
      const html = buildHtml({
        assistance,
        buildingLabel,
        interventionName: intervention?.name ?? "—",
        note,
        ageDays,
      });

      try {
        const { error: emailErr } = await supabase.functions.invoke("send-email", {
          body: { to: RECIPIENT, subject, html, email_type: "manual_reminder" },
        });
        if (emailErr) throw emailErr;

        await supabase
          .from("follow_up_schedules")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempt_count: 1,
          })
          .eq("id", r.id);
        sent++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${r.id}: ${msg}`);
        await supabase
          .from("follow_up_schedules")
          .update({
            attempt_count: 1,
            metadata: { ...(r.metadata ?? {}), last_error: msg },
          })
          .eq("id", r.id);
      }
    }

    return json({ processed: rows.length, sent, skipped, errors });
  } catch (e) {
    console.error("manual-reminders-cron error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  assistance: { id: string; assistance_number: number | null; title: string; description: string | null; priority: string; status: string };
  buildingLabel: string;
  interventionName: string;
  note: string;
  ageDays: number;
}) {
  const { assistance, buildingLabel, interventionName, note, ageDays } = args;
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f5f7;padding:20px;color:#222;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:10px;padding:24px;box-shadow:0 2px 6px rgba(0,0,0,0.06);">
      <div style="display:flex;align-items:center;gap:8px;margin:0 0 8px;">
        <span style="font-size:22px;">🔔</span>
        <h2 style="margin:0;color:#0f172a;font-size:18px;">Lembrete de follow-up</h2>
      </div>
      <p style="margin:0 0 18px;color:#64748b;font-size:13px;">Lembrete agendado por ti ao criar esta assistência.</p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;margin-bottom:18px;">
        <div style="font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px;">Nota</div>
        <div style="color:#451a03;font-size:14px;">${note ? escape(note) : "<em style='color:#a16207;'>(sem nota)</em>"}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:140px;">Assistência</td><td style="padding:6px 0;font-weight:600;">#${assistance.assistance_number ?? "—"} ${escape(assistance.title)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Edifício</td><td style="padding:6px 0;">${escape(buildingLabel)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Intervenção</td><td style="padding:6px 0;">${escape(interventionName)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Prioridade</td><td style="padding:6px 0;">${priorityChip(assistance.priority)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Estado actual</td><td style="padding:6px 0;">${escape(assistance.status)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Em aberto há</td><td style="padding:6px 0;">${ageDays} ${ageDays === 1 ? "dia" : "dias"}</td></tr>
      </table>

      ${assistance.description ? `<div style="margin-top:16px;padding:12px 14px;background:#f8fafc;border-radius:8px;font-size:13px;color:#334155;">${escape(assistance.description)}</div>` : ""}

      <div style="margin-top:24px;text-align:center;">
        <a href="${APP_URL}/assistencias?id=${assistance.id}" style="background:#3b82f6;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Abrir assistência</a>
      </div>
      <p style="margin-top:24px;color:#94a3b8;font-size:12px;text-align:center;">Email automático Luvimg · geral@luvimg.com</p>
    </div>
  </body></html>`;
}
