import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "message/rfc822",
  "application/octet-stream", // some browsers send .eml as this
]);

const MAX_BYTES = 15 * 1024 * 1024; // 15MB

interface Body {
  pendencyId: string;
  fileName: string;
  fileType: string;
  fileData: string; // data URL or base64
  kind?: "email_pdf" | "reply_pdf" | "attachment" | "other";
  description?: string;
}

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/\s/g, "");
  const binary = atob(cleaned);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("[upload-pendency-file] Missing env vars");
      return jsonResponse({ error: "Servidor mal configurado" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("[upload-pendency-file] Missing Authorization header");
      return jsonResponse({ error: "Sessão inválida (sem token)" }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (authError || !user) {
      console.error("[upload-pendency-file] Auth failed:", authError?.message);
      return jsonResponse({ error: "Não autenticado" }, 401);
    }

    const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin", {
      _user_id: user.id,
    });
    if (adminErr) {
      console.error("[upload-pendency-file] is_admin RPC error:", adminErr.message);
      return jsonResponse({ error: "Falha na verificação de permissões" }, 500);
    }
    if (!isAdmin) {
      console.warn("[upload-pendency-file] Non-admin attempt:", user.id);
      return jsonResponse({ error: "Sem permissão" }, 403);
    }

    let body: Body;
    try {
      body = await req.json();
    } catch (e: any) {
      console.error("[upload-pendency-file] Invalid JSON body:", e?.message);
      return jsonResponse({ error: "Pedido inválido (JSON)" }, 400);
    }

    const { pendencyId, fileName, fileType, fileData, kind = "email_pdf", description } = body;

    if (!pendencyId || !fileName || !fileType || !fileData) {
      console.warn("[upload-pendency-file] Missing fields", {
        hasPendencyId: !!pendencyId,
        hasFileName: !!fileName,
        hasFileType: !!fileType,
        hasFileData: !!fileData,
      });
      return jsonResponse({ error: "Campos em falta no pedido" }, 400);
    }

    const normalizedMime = fileType.toLowerCase().split(";")[0].trim();
    if (!ALLOWED_MIME.has(normalizedMime)) {
      console.warn("[upload-pendency-file] Unsupported MIME:", fileType);
      return jsonResponse(
        { error: `Tipo de ficheiro não suportado: ${fileType}` },
        400,
      );
    }

    let bytes: Uint8Array;
    try {
      const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
      bytes = base64ToBytes(base64);
    } catch (e: any) {
      console.error("[upload-pendency-file] Base64 decode failed:", e?.message);
      return jsonResponse({ error: "Falha ao descodificar o ficheiro" }, 400);
    }

    if (bytes.length === 0) {
      return jsonResponse({ error: "Ficheiro vazio" }, 400);
    }
    if (bytes.length > MAX_BYTES) {
      return jsonResponse({ error: "Ficheiro demasiado grande (máx. 15 MB)" }, 400);
    }

    const { data: pendency, error: pErr } = await supabase
      .from("email_pendencies")
      .select("id")
      .eq("id", pendencyId)
      .maybeSingle();
    if (pErr) {
      console.error("[upload-pendency-file] Pendency lookup error:", pErr.message);
      return jsonResponse({ error: "Erro ao verificar pendência", details: pErr.message }, 500);
    }
    if (!pendency) {
      return jsonResponse({ error: "Pendência não encontrada" }, 404);
    }

    const ts = new Date().toISOString().replace(/[:.\-T]/g, "").replace(/Z$/, "");
    const safeName = (fileName
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(-120)) || "ficheiro";
    const path = `${pendencyId}/${kind}_${ts}_${safeName}`;

    console.log("[upload-pendency-file] Uploading", {
      path,
      bytes: bytes.length,
      mime: normalizedMime,
      user: user.id,
    });

    const { error: upErr } = await supabase.storage
      .from("email-pendencies")
      .upload(path, bytes, { contentType: normalizedMime, upsert: false });

    if (upErr) {
      console.error("[upload-pendency-file] Storage upload failed:", upErr.message);
      return jsonResponse({ error: "Falha no upload", details: upErr.message }, 500);
    }

    const { data: record, error: insErr } = await supabase
      .from("email_pendency_attachments")
      .insert({
        pendency_id: pendencyId,
        file_name: fileName,
        file_path: path,
        file_size: bytes.length,
        mime_type: normalizedMime,
        kind,
        description: description || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insErr) {
      console.error("[upload-pendency-file] DB insert failed:", insErr.message);
      await supabase.storage.from("email-pendencies").remove([path]);
      return jsonResponse({ error: "Falha ao registar anexo", details: insErr.message }, 500);
    }

    const { data: signed } = await supabase.storage
      .from("email-pendencies")
      .createSignedUrl(path, 60 * 60);

    // Activity log best-effort (não bloqueia a resposta)
    supabase
      .from("activity_log")
      .insert({
        user_id: user.id,
        action: "pendency_attachment_uploaded",
        details: `Anexado ${fileName} à pendência`,
        metadata: { pendency_id: pendencyId, file_path: path, kind },
      })
      .then(({ error }) => {
        if (error) {
          console.warn("[upload-pendency-file] activity_log insert failed:", error.message);
        }
      });

    return jsonResponse(
      { success: true, attachment: record, signedUrl: signed?.signedUrl ?? null },
      200,
    );
  } catch (e: any) {
    console.error("[upload-pendency-file] Unhandled error:", e?.message, e?.stack);
    return jsonResponse({ error: "Erro interno", details: e?.message ?? String(e) }, 500);
  }
});
