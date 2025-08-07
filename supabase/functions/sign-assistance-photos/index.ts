import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignRequest {
  paths: string[];
  expiresIn?: number; // seconds
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, serviceRole);

    // Verify caller is authenticated and an admin
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check admin role
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Role check failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!roles) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = (await req.json()) as SignRequest;
    const expiresIn = body.expiresIn && body.expiresIn > 0 ? body.expiresIn : 60 * 60; // default 1h
    const paths = Array.isArray(body.paths) ? body.paths : [];

    if (!paths.length) {
      return new Response(JSON.stringify({ error: 'No paths provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const results: Record<string, string | null> = {};

    for (const p of paths) {
      const { data: signed, error } = await supabase.storage
        .from('assistance-photos')
        .createSignedUrl(p, expiresIn);
      if (error) {
        console.error('Sign error for', p, error.message);
        results[p] = null;
      } else {
        results[p] = signed?.signedUrl ?? null;
      }
    }

    return new Response(JSON.stringify({ urls: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    console.error('sign-assistance-photos error:', e?.message || e);
    return new Response(JSON.stringify({ error: 'Internal error', details: e?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
