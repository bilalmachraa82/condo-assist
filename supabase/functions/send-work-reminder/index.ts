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
    
    console.log('Processing work reminder for followup:', followup.id);

    // Get supplier and assistance details
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name, email')
      .eq('id', followup.supplier_id)
      .single();

    const { data: assistance } = await supabase
      .from('assistances')
      .select(`
        title, description, priority, scheduled_start_date,
        buildings(name, address, nif),
        intervention_types(name)
      `)
      .eq('id', followup.assistance_id)
      .single();

    if (!supplier?.email || !assistance) {
      throw new Error('Missing supplier email or assistance data');
    }

    // Get or create magic code for supplier access
    let { data: existingCode } = await supabase
      .from('supplier_magic_codes')
      .select('magic_code')
      .eq('supplier_id', followup.supplier_id)
      .eq('assistance_id', followup.assistance_id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let magicCode = existingCode?.magic_code;

    if (!magicCode) {
      const { data: newCode } = await supabase.rpc('generate_magic_code');
      magicCode = newCode;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabase.from('supplier_magic_codes').insert({
        supplier_id: followup.supplier_id,
        assistance_id: followup.assistance_id,
        magic_code: magicCode,
        expires_at: expiresAt.toISOString()
      });
    }

    // Format the scheduled date
    const workDate = assistance.scheduled_start_date 
      ? new Date(assistance.scheduled_start_date).toLocaleDateString('pt-PT', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'Data não definida';

    // Send email using the send-email function
    const portalUrl = `${Deno.env.get('APP_BASE_URL') || 'https://547ef223-c1fa-45ad-b53c-1ad4427f0d14.lovableproject.com'}/supplier-portal?code=${magicCode}`;
    
    const emailData = {
      to: supplier.email,
      subject: `⏰ Lembrete de Trabalho - ${assistance.title} (${workDate})`,
      template: 'work_reminder',
      data: {
        supplierName: supplier.name,
        magicCode: magicCode,
        portalUrl: portalUrl,
        workDate: workDate,
        assistanceDetails: {
          title: assistance.title,
          description: assistance.description,
          priority: assistance.priority,
          buildingName: assistance.buildings?.[0]?.name,
          buildingAddress: assistance.buildings?.[0]?.address,
          buildingNif: assistance.buildings?.[0]?.nif,
          interventionType: assistance.intervention_types?.[0]?.name,
          scheduledDate: assistance.scheduled_start_date
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
      template_used: 'work_reminder',
      status: 'sent',
      metadata: {
        followup_id: followup.id,
        followup_type: followup.follow_up_type,
        work_date: assistance.scheduled_start_date
      }
    });

    console.log('Work reminder email sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Work reminder sent' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error sending work reminder:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send work reminder' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);