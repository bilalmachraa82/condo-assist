// Parse a pendency-related PDF/image with Lovable AI Gateway and return structured fields.
// Used by the "Auto-fill" button in CreatePendencyDialog.
import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ParseRequest {
  // Either a base64 file (data URL or raw base64) or a storage path in 'pendency-attachments' bucket
  fileBase64?: string;
  storagePath?: string;
  mimeType?: string;
}

const SYSTEM = `És um assistente que extrai metadados de emails/documentos PDF de gestão de condomínios em português.
Devolve apenas JSON válido com os campos:
{
  "title": "título curto (máx 80 chars) descrevendo o pedido",
  "subject": "assunto do email se identificável",
  "description": "resumo do conteúdo (máx 400 chars)",
  "building_hint": "código ou nome do edifício referido (ex: 'GAL', 'Cond. Rua X')",
  "supplier_hint": "nome do fornecedor mencionado se houver",
  "priority": "normal|urgent|critical (urgente apenas se palavras como 'urgente','crítico','emergência')"
}
Se um campo não for identificável, devolve string vazia. Não inventes dados.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ParseRequest;
    let base64: string | undefined = body.fileBase64;
    let mimeType = body.mimeType || "application/pdf";

    if (!base64 && body.storagePath) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);
      const { data, error } = await sb.storage.from("pendency-attachments").download(body.storagePath);
      if (error || !data) throw new Error("Não foi possível ler o ficheiro: " + (error?.message || ""));
      mimeType = data.type || mimeType;
      const buf = new Uint8Array(await data.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      base64 = btoa(bin);
    }

    if (!base64) {
      return new Response(JSON.stringify({ error: "É necessário fileBase64 ou storagePath" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (base64.startsWith("data:")) {
      const [, b64] = base64.split(",", 2);
      base64 = b64;
    }

    const dataUrl = `data:${mimeType};base64,${base64}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrai os metadados deste documento e devolve apenas JSON." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de chamadas atingido. Tenta novamente em breve." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos AI esgotados. Adiciona créditos no workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: "Erro AI Gateway", detail: txt }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await resp.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    return new Response(JSON.stringify({
      title: String(parsed.title ?? "").slice(0, 200),
      subject: String(parsed.subject ?? "").slice(0, 300),
      description: String(parsed.description ?? "").slice(0, 1000),
      building_hint: String(parsed.building_hint ?? ""),
      supplier_hint: String(parsed.supplier_hint ?? ""),
      priority: ["normal", "urgent", "critical"].includes(parsed.priority) ? parsed.priority : "normal",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
