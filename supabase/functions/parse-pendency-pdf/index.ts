// Parse a pendency-related PDF/image with Lovable AI Gateway and return structured fields.
// Used by the "Auto-preencher com IA" button in CreatePendencyDialog.
//
// Security:
//  - Requires a valid Supabase auth token (401 otherwise).
//  - Requires admin role via RPC is_admin (403 otherwise).
//  - Rate limited per user via public.agent_api_rate_limit (20 calls / 10 min).
//  - Logs only safe metadata (mime, size, status, model, duration).
//    Never logs the raw model response, the document text, or excerpts (RGPD).
//
// PDF handling per Lovable AI Gateway multimodal docs:
//  - image/*           → { type: "image_url", image_url: { url: dataUrl } }
//  - application/pdf   → { type: "file", file: { filename, file_data: dataUrl } }
//  - other types       → 415
//  - empty AI response → 422 ("possível PDF digitalizado sem texto") in vez de 200 silencioso.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 20;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  eml: "message/rfc822",
  txt: "text/plain",
};

interface ParseRequest {
  fileBase64?: string;
  storagePath?: string;
  mimeType?: string;
  fileName?: string;
}

function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/\s/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeBase64Text(base64: string): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(base64ToBytes(base64));
}

function compactEmailText(raw: string): string {
  return raw
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => !/^[A-Za-z0-9+/=]{200,}$/.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 20_000);
}

function inferMimeType(mimeType: string, fileName: string) {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  return MIME_BY_EXTENSION[extension] ?? (normalized || "application/octet-stream");
}

const SYSTEM = `És um assistente que extrai metadados de emails/documentos PDF de gestão de condomínios em português de Portugal.
Devolve apenas JSON válido com os campos:
{
  "title": "título curto do assunto/tarefa (máx 80 chars), sem código, sem nome do prédio e sem morada. Ex: 'Pedido orçamento elevador'. Se só vires o prédio/morada, devolve string vazia.",
  "subject": "assunto original do email se identificável, sem nome do prédio e sem morada. Se houver código de prédio (ex: '088', '074', 'GAL'), começa com o código seguido de ' - '. Ex: '088 - Pedido orçamento elevador'. Se só vires o prédio/morada, devolve string vazia.",
  "description": "resumo do conteúdo (máx 400 chars)",
  "building_hint": "código do prédio se identificável (3 dígitos como '088','074' ou sigla como 'GAL'). Procura no assunto, cabeçalho, nome ou morada. Devolve apenas o código, não o nome nem a morada.",
  "supplier_hint": "nome do fornecedor mencionado se houver",
  "priority": "normal|urgent|critical (urgente apenas se palavras como 'urgente','crítico','emergência')"
}
Regras importantes:
- Nunca copies a morada ou o nome do condomínio para title ou subject.
- A morada/nome do condomínio serve apenas para identificar building_hint.
- Se o email tiver subject do tipo '=003= COND. RUA ...', subject deve ficar vazio ou apenas o texto útil depois do prédio, se existir.
Se um campo não for identificável, devolve string vazia. Não inventes dados.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("[parse-pendency-pdf] missing supabase env");
      return json({ error: "Servidor mal configurado" }, 500);
    }
    if (!apiKey) {
      console.error("[parse-pendency-pdf] missing LOVABLE_API_KEY");
      return json({ error: "LOVABLE_API_KEY não configurada" }, 500);
    }

    // --- AuthN ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Sessão inválida" }, 401);
    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (authError || !user) return json({ error: "Não autenticado" }, 401);

    // --- AuthZ (admin only) ---
    const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (adminErr) {
      console.error("[parse-pendency-pdf] is_admin RPC error");
      return json({ error: "Falha na verificação de permissões" }, 500);
    }
    if (!isAdmin) {
      console.warn("[parse-pendency-pdf] non-admin attempt");
      return json({ error: "Sem permissão" }, 403);
    }

    // --- Rate limit (per user) ---
    const rlKey = `parse-pendency-pdf:${user.id}`;
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString();
    try {
      const { count } = await supabase
        .from("agent_api_rate_limit")
        .select("*", { count: "exact", head: true })
        .eq("api_key_hash", rlKey)
        .gte("request_at", windowStart);
      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        return json({ error: "Demasiados pedidos. Tenta novamente daqui a alguns minutos." }, 429);
      }
      await supabase.from("agent_api_rate_limit").insert({ api_key_hash: rlKey });
    } catch (_e) {
      // Don't block on rate-limit failures.
    }

    // --- Input ---
    const body = (await req.json()) as ParseRequest;
    let base64: string | undefined = body.fileBase64;
    let mimeType = (body.mimeType || "application/pdf").toLowerCase().split(";")[0].trim();
    const fileName = (body.fileName || "documento").slice(0, 120);
    mimeType = inferMimeType(mimeType, fileName);

    if (!base64 && body.storagePath) {
      // Matches upload-pendency-file and email_pendency_attachments.file_path.
      const { data, error } = await supabase.storage.from("email-pendencies").download(body.storagePath);
      if (error || !data) return json({ error: "Não foi possível ler o ficheiro" }, 400);
      mimeType = inferMimeType(data.type || mimeType, fileName);
      const buf = new Uint8Array(await data.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      base64 = btoa(bin);
    }

    if (!base64) return json({ error: "É necessário fileBase64 ou storagePath" }, 400);
    if (base64.startsWith("data:")) base64 = base64.split(",", 2)[1] ?? base64;

    const approxBytes = Math.floor(base64.length * 0.75);
    if (approxBytes > MAX_BYTES) {
      return json({ error: "Ficheiro demasiado grande (máx. 15 MB)" }, 413);
    }

    const isPdf = mimeType === "application/pdf";
    const isImage = mimeType.startsWith("image/");
    const isEmailText = mimeType === "message/rfc822" || mimeType === "text/plain";
    if (!isPdf && !isImage && !isEmailText) {
      return json({ error: `Tipo de ficheiro não suportado para análise IA: ${mimeType}` }, 415);
    }

    const dataUrl = `data:${mimeType};base64,${base64}`;

    const userContent: unknown[] = [
      { type: "text", text: "Extrai os metadados deste documento e devolve apenas JSON." },
    ];
    if (isEmailText) {
      const emailText = compactEmailText(decodeBase64Text(base64));
      if (!emailText.trim()) {
        return json({ error: "Não foi possível ler texto do ficheiro de email." }, 422);
      }
      userContent[0] = {
        type: "text",
        text: `Extrai os metadados deste email em bruto e devolve apenas JSON. Ignora anexos codificados e assinaturas repetidas.\n\n${emailText}`,
      };
    } else if (isPdf) {
      userContent.push({
        type: "file",
        file: {
          filename: fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`,
          file_data: dataUrl,
        },
      });
    } else {
      userContent.push({ type: "image_url", image_url: { url: dataUrl } });
    }

    const model = "google/gemini-2.5-flash";
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const duration = Date.now() - t0;
    console.log(`[parse-pendency-pdf] mime=${mimeType} bytes=${approxBytes} status=${resp.status} model=${model} dur=${duration}ms`);

    if (resp.status === 429) return json({ error: "Limite de chamadas IA atingido. Tenta novamente em breve." }, 429);
    if (resp.status === 402) return json({ error: "Créditos AI esgotados. Adiciona créditos no workspace." }, 402);
    if (!resp.ok) {
      try { await resp.text(); } catch { /* nunca logar conteúdo */ }
      return json({ error: "Erro no AI Gateway" }, 502);
    }

    let aiJson: any;
    try { aiJson = await resp.json(); } catch { aiJson = null; }
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "{}";

    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const result = {
      title: String(parsed.title ?? "").slice(0, 200),
      subject: String(parsed.subject ?? "").slice(0, 300),
      description: String(parsed.description ?? "").slice(0, 1000),
      building_hint: String(parsed.building_hint ?? ""),
      supplier_hint: String(parsed.supplier_hint ?? ""),
      priority: ["normal", "urgent", "critical"].includes(parsed.priority) ? parsed.priority : "normal",
    };

    const hasContent = !!(result.title || result.subject || result.description || result.building_hint);
    if (!hasContent) {
      return json({
        error: "Não foi possível extrair conteúdo do documento. Pode ser um PDF digitalizado sem texto.",
        warning: true,
      }, 422);
    }

    return json(result);
  } catch (e: any) {
    console.error("[parse-pendency-pdf] unexpected:", e?.message ?? "unknown");
    return json({ error: "Erro inesperado" }, 500);
  }
});
