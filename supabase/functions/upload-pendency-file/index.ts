import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("authorization");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace("Bearer ", "") ?? "",
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json();
    const { pendencyId, fileName, fileType, fileData, kind = "email_pdf", description } = body;

    if (!pendencyId || !fileName || !fileType || !fileData) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_MIME.has(fileType)) {
      return new Response(JSON.stringify({ error: `Unsupported MIME type: ${fileType}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    if (bytes.length > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File too large (max 15MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm pendency exists
    const { data: pendency, error: pErr } = await supabase
      .from("email_pendencies")
      .select("id")
      .eq("id", pendencyId)
      .maybeSingle();
    if (pErr || !pendency) {
      return new Response(JSON.stringify({ error: "Pendency not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ts = new Date().toISOString().replace(/[:.-]/g, "");
    const safeName = fileName.replace(/[^\w.\-]+/g, "_");
    const path = `${pendencyId}/${kind}_${ts}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("email-pendencies")
      .upload(path, bytes, { contentType: fileType, upsert: false });
    if (upErr) {
      return new Response(JSON.stringify({ error: "Upload failed", details: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: record, error: insErr } = await supabase
      .from("email_pendency_attachments")
      .insert({
        pendency_id: pendencyId,
        file_name: fileName,
        file_path: path,
        file_size: bytes.length,
        mime_type: fileType,
        kind,
        description: description || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insErr) {
      await supabase.storage.from("email-pendencies").remove([path]);
      return new Response(JSON.stringify({ error: "DB insert failed", details: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed } = await supabase.storage
      .from("email-pendencies")
      .createSignedUrl(path, 60 * 60);

    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: "pendency_attachment_uploaded",
      details: `Anexado ${fileName} à pendência`,
      metadata: { pendency_id: pendencyId, file_path: path, kind },
    });

    return new Response(
      JSON.stringify({ success: true, attachment: record, signedUrl: signed?.signedUrl ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Internal error", details: e?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
