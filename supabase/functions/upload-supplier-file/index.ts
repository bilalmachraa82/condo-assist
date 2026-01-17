import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UploadRequest {
  magicCode: string;
  assistanceId: string;
  fileName: string;
  fileType: string;
  fileData: string; // base64
  fileCategory: 'quotation' | 'photo' | 'document';
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "0.0.0.0";

    const body: UploadRequest = await req.json();
    const { magicCode, assistanceId, fileName, fileType, fileData, fileCategory } = body;

    // Validate required fields
    if (!magicCode || !assistanceId || !fileName || !fileType || !fileData) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const allowedTypes = {
      quotation: ['application/pdf'],
      photo: ['image/jpeg', 'image/png', 'image/webp'],
      document: ['application/pdf', 'image/jpeg', 'image/png']
    };

    if (!allowedTypes[fileCategory]?.includes(fileType)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type for ${fileCategory}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit using the secure function
    const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc(
      'check_magic_code_rate_limit',
      { p_ip_address: clientIP, p_magic_code: magicCode }
    );

    if (rateLimitError || !rateLimitResult?.allowed) {
      console.error("Rate limit exceeded:", rateLimitError || rateLimitResult);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded", 
          retryAfter: rateLimitResult?.retry_after || 3600 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate magic code and get supplier info
    const { data: validationResult, error: validationError } = await supabase.rpc(
      'validate_supplier_session_readonly',
      { p_magic_code: magicCode }
    );

    if (validationError || !validationResult?.valid) {
      console.error("Magic code validation failed:", validationError || validationResult);
      
      // Log security event
      await supabase.rpc('log_security_event', {
        p_event_type: 'invalid_upload_attempt',
        p_severity: 'medium',
        p_ip_address: clientIP,
        p_details: { 
          magic_code: magicCode.substring(0, 3) + '****',
          file_category: fileCategory 
        }
      });

      return new Response(
        JSON.stringify({ error: "Invalid or expired magic code" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supplierId = validationResult.supplier_id;

    // Verify the assistance belongs to this supplier
    const { data: assistance, error: assistanceError } = await supabase
      .from('assistances')
      .select('id, assigned_supplier_id')
      .eq('id', assistanceId)
      .single();

    if (assistanceError || !assistance || assistance.assigned_supplier_id !== supplierId) {
      return new Response(
        JSON.stringify({ error: "Assistance not found or not assigned to this supplier" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 file data
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Validate file size (max 10MB)
    if (binaryData.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 10MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize filename
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);

    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `${fileCategory}/${supplierId}/${assistanceId}/${timestamp}_${sanitizedFileName}`;

    // Upload file using service role (bypasses RLS)
    const { error: uploadError } = await supabase.storage
      .from('assistance-photos')
      .upload(filePath, binaryData, {
        contentType: fileType,
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL (1 hour expiry for security)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('assistance-photos')
      .createSignedUrl(filePath, 3600); // 1 hour

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
    }

    // Log the upload activity
    await supabase.from('activity_log').insert({
      assistance_id: assistanceId,
      supplier_id: supplierId,
      action: 'file_uploaded',
      details: `Ficheiro carregado: ${sanitizedFileName}`,
      metadata: {
        file_category: fileCategory,
        file_type: fileType,
        file_path: filePath,
        file_size: binaryData.length
      }
    });

    // If it's a photo, also add to assistance_photos table
    if (fileCategory === 'photo') {
      await supabase.from('assistance_photos').insert({
        assistance_id: assistanceId,
        file_url: filePath,
        photo_type: 'supplier_upload',
        uploaded_by_supplier: supplierId
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        filePath,
        signedUrl: signedUrlData?.signedUrl,
        message: "File uploaded successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});