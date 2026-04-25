import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS - tem de aceitar POST do cliente de email (RFC 8058 one-click)
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f3f4f6;margin:0;padding:40px 16px;color:#111827}
  .card{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,.05);text-align:center}
  h1{font-size:20px;margin:0 0 12px}
  p{color:#4b5563;line-height:1.5;margin:8px 0}
  .ok{color:#059669}
  .err{color:#dc2626}
  .small{font-size:12px;color:#9ca3af;margin-top:24px}
</style></head>
<body><div class="card">${body}<p class="small">Luvimg — Administração de Condomínios</p></div></body></html>`;
}

async function processUnsubscribe(token: string, source: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: row, error } = await admin
    .from("email_unsubscribes")
    .select("id,email,unsubscribed_at")
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  if (!row) return { ok: false, reason: "invalid" as const };

  if (!row.unsubscribed_at) {
    const { error: updErr } = await admin
      .from("email_unsubscribes")
      .update({ unsubscribed_at: new Date().toISOString(), source })
      .eq("id", row.id);
    if (updErr) throw updErr;
  }

  return { ok: true as const, email: row.email };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token") || "";

    // Suporte a POST one-click (RFC 8058) — corpo form-urlencoded ou JSON
    if (req.method === "POST" && !token) {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const body = await req.json().catch(() => ({}));
        token = body?.token || "";
      } else {
        const form = await req.formData().catch(() => null);
        if (form) token = String(form.get("token") || "");
      }
    }

    if (!token) {
      const html = htmlPage("Link inválido", `<h1 class="err">Link inválido</h1><p>O link de cancelamento não tem token.</p>`);
      return new Response(html, { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
    }

    const result = await processUnsubscribe(token, req.method === "POST" ? "one-click" : "link");

    // POST (one-click): resposta curta, sem HTML
    if (req.method === "POST") {
      if (!result.ok) {
        return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: página HTML
    if (!result.ok) {
      const html = htmlPage("Link inválido", `<h1 class="err">Link inválido ou expirado</h1><p>Não conseguimos identificar este pedido. Se continuar a receber emails que não deseja, contacte <a href="mailto:geral@luvimg.com">geral@luvimg.com</a>.</p>`);
      return new Response(html, { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
    }

    const html = htmlPage("Subscrição cancelada", `<h1 class="ok">Subscrição cancelada</h1><p>O endereço <strong>${result.email}</strong> foi removido da nossa lista de comunicações automáticas.</p><p>Se isto foi um engano, contacte <a href="mailto:geral@luvimg.com">geral@luvimg.com</a>.</p>`);
    return new Response(html, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
  } catch (err: any) {
    console.error("email-unsubscribe error:", err);
    const html = htmlPage("Erro", `<h1 class="err">Erro ao processar</h1><p>Ocorreu um erro. Tente novamente mais tarde.</p>`);
    return new Response(html, { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
  }
});
