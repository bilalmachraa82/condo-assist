import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  assistanceId: string;
  photoType: 'before' | 'during' | 'after' | 'other';
  caption?: string;
  file: {
    name: string;
    type: string;
    data: string; // base64 encoded
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const { assistanceId, photoType, caption, file }: UploadRequest = await req.json();

    // Validate required fields
    if (!assistanceId || !photoType || !file || !file.data || !file.name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Convert base64 to Uint8Array
    const base64Data = file.data.split(',')[1] || file.data;
    const fileData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${assistanceId}/${photoType}_${timestamp}.${fileExtension}`;

    console.log('Uploading file:', fileName, 'Size:', fileData.length);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assistance-photos')
      .upload(fileName, fileData, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Generate a short-lived signed URL for immediate preview
    const { data: signedData, error: signedError } = await supabase.storage
      .from('assistance-photos')
      .createSignedUrl(fileName, 60 * 60); // 1 hour

    if (signedError) {
      console.error('Signed URL error:', signedError);
    }

    console.log('File uploaded successfully at path:', fileName);

    // Save photo record to database (store path instead of public URL)
    const { data: photoRecord, error: dbError } = await supabase
      .from('assistance_photos')
      .insert({
        assistance_id: assistanceId,
        photo_type: photoType,
        file_url: fileName, // store path; UI will request signed URL
        caption: caption || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      
      // Try to clean up uploaded file
      await supabase.storage
        .from('assistance-photos')
        .remove([fileName]);

      return new Response(
        JSON.stringify({ error: 'Failed to save photo record', details: dbError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Log activity
    await supabase
      .from('activity_log')
      .insert({
        assistance_id: assistanceId,
        user_id: user.id,
        action: 'photo_uploaded',
        details: `Uploaded ${photoType} photo: ${file.name}`,
        metadata: {
          photo_type: photoType,
          file_name: file.name,
          file_size: fileData.length
        }
      });

    console.log('Photo upload completed successfully:', photoRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        photo: photoRecord,
        signedUrl: signedData?.signedUrl ?? null
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in upload-assistance-photo function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);