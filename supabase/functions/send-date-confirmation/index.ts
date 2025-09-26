import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { followup } = await req.json();
    
    console.log('Processing date confirmation for followup:', followup.id);

    // Get supplier and assistance details
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name, email')
      .eq('id', followup.supplier_id)
      .single();

    const { data: assistance } = await supabase
      .from('assistances')
      .select(`
        title, description, priority,
        buildings(name, address, nif),
        intervention_types(name)
      `)
      .eq('id', followup.assistance_id)
      .single();

    if (!supplier?.email || !assistance) {
      throw new Error('Missing supplier email or assistance data');
    }

    // Generate magic code for supplier access
    const { data: magicCode } = await supabase.rpc('generate_magic_code');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase.from('supplier_magic_codes').insert({
      supplier_id: followup.supplier_id,
      assistance_id: followup.assistance_id,
      magic_code: magicCode,
      expires_at: expiresAt.toISOString()
    });

    // Send email using the send-email function
    const portalUrl = `${Deno.env.get('APP_BASE_URL') || 'https://547ef223-c1fa-45ad-b53c-1ad4427f0d14.lovableproject.com'}/supplier-portal?code=${magicCode}`;
    
    const emailData = {
      to: supplier.email,
      subject: `🕐 Confirmação de Data - ${assistance.title}`,
      template: 'date_confirmation',
      data: {
        supplierName: supplier.name,
        magicCode: magicCode,
        portalUrl: portalUrl,
        assistanceDetails: {
          title: assistance.title,
          description: assistance.description,
          priority: assistance.priority,
          buildingName: assistance.buildings?.[0]?.name,
          buildingAddress: assistance.buildings?.[0]?.address,
          buildingNif: assistance.buildings?.[0]?.nif,
          interventionType: assistance.intervention_types?.[0]?.name
        }
      }
    };

    const emailResponse = await supabase.functions.invoke('send-email', {
      body: emailData
    });

    if (emailResponse.error) {
      console.error('Email sending failed:', emailResponse.error);
      throw emailResponse.error;
    }

    // Log the email
    await supabase.from('email_logs').insert({
      assistance_id: followup.assistance_id,
      supplier_id: followup.supplier_id,
      recipient_email: supplier.email,
      subject: emailData.subject,
      template_used: 'date_confirmation',
      status: 'sent',
      metadata: {
        followup_id: followup.id,
        followup_type: followup.follow_up_type
      }
    });

    console.log('Date confirmation email sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Date confirmation sent' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error sending date confirmation:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send date confirmation' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);