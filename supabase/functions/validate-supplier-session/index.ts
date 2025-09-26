import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { magicCode } = await req.json()
    
    if (!magicCode) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Magic code is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get client IP and user agent for security logging
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Use the simplified validation function to avoid transaction issues
    const { data: result, error } = await supabaseClient
      .rpc('validate_supplier_session_simple', {
        p_magic_code: magicCode
      })

    if (error) {
      console.error('Error validating supplier session:', error)
      
      // Log the error as a security event
      await supabaseClient.rpc('log_security_event', {
        p_event_type: 'validation_error',
        p_severity: 'high',
        p_details: {
          error: error.message,
          magic_code_prefix: magicCode.substring(0, 4) + '***',
          ip_address: clientIP
        },
        p_ip_address: clientIP,
        p_user_agent: userAgent
      })

      return new Response(
        JSON.stringify({ valid: false, error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})