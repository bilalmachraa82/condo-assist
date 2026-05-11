// Parse a Portuguese assembly minutes PDF and return a structured list of topics
// (assuntos) ready to be reviewed and imported into assembly_items.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParseRequest {
  fileBase64?: string;
  storagePath?: string; // path in 'building-documents' bucket
  mimeType?: string;
}

const VALID_CATEGORIES = [
  "limpeza_caleiras", "elevadores", "fachada", "seguros", "intercomunicadores",
  "limpeza", "colunas_eletricas", "cobertura", "portoes", "gas", "obras", "geral",
];

const SYSTEM = `És um assistente que lê actas de assembleias de condomínios em português (PT-PT)
e devolve a lista de ASSUNTOS / DELIBERAÇÕES discutidos.

Devolve SEMPRE um JSON válido com a estrutura:
{
  "topics": [
    {
      "title": "título curto do assunto (máx 120 chars)",
      "description": "descrição/deliberação (máx 600 chars)",
      "category": "uma de: ${VALID_CATEGORIES.join(", ")}",
      "priority": "low|normal|high|urgent",
      "estimated_cost": número em euros ou null,
      "notes": "notas adicionais ou null"
    }
  ]
}

Regras:
- Identifica cada ponto da ordem de trabalhos / deliberação como um topic separado.
- Categoriza pelo conteúdo (ex: "limpeza de caleiras" → limpeza_caleiras, "manutenção elevador" → elevadores).
- Se não conseguires categorizar, usa "geral".
- Extrai valores monetários se mencionados (ex: "33.550€" → 33550).
- Marca prioridade "high" ou "urgent" se contiver palavras como "urgente", "imediato", "prioritário".
- Não inventes assuntos que não estejam na acta.`;

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
      const { data, error } = await sb.storage.from("building-documents").download(body.storagePath);
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
              { type: "text", text: "Extrai todos os assuntos desta acta de assembleia. Devolve apenas JSON." },
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

    const rawTopics: any[] = Array.isArray(parsed.topics) ? parsed.topics : [];
    const topics = rawTopics.map((t) => ({
      title: String(t.title ?? "").slice(0, 200),
      description: String(t.description ?? "").slice(0, 1000),
      category: VALID_CATEGORIES.includes(t.category) ? t.category : "geral",
      priority: ["low", "normal", "high", "urgent"].includes(t.priority) ? t.priority : "normal",
      estimated_cost: typeof t.estimated_cost === "number" && t.estimated_cost > 0 ? t.estimated_cost : null,
      notes: t.notes ? String(t.notes).slice(0, 500) : null,
    })).filter((t) => t.title || t.description);

    return new Response(JSON.stringify({ topics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
