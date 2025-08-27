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
    
    console.log('Processing completion reminder for followup:', followup.id);

    // Get supplier and assistance details
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name, email')
      .eq('id', followup.supplier_id)
      .single();

    const { data: assistance } = await supabase
      .from('assistances')
      .select(`
        title, description, priority, expected_completion_date, status,
        buildings!inner(name, address, nif),
        intervention_types!inner(name)
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

    // Calculate days overdue if applicable
    const expectedDate = assistance.expected_completion_date ? new Date(assistance.expected_completion_date) : null;
    const today = new Date();
    const daysOverdue = expectedDate ? Math.ceil((today.getTime() - expectedDate.getTime()) / (1000 * 3600 * 24)) : 0;

    // Format the expected completion date
    const expectedDateStr = expectedDate 
      ? expectedDate.toLocaleDateString('pt-PT', {
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
      subject: `⏰ Lembrete de Conclusão - ${assistance.title}${daysOverdue > 0 ? ` (${daysOverdue} dias em atraso)` : ''}`,
      template: 'completion_reminder',
      data: {
        supplierName: supplier.name,
        magicCode: magicCode,
        portalUrl: portalUrl,
        expectedDate: expectedDateStr,
        daysOverdue: daysOverdue,
        isOverdue: daysOverdue > 0,
        assistanceDetails: {
          title: assistance.title,
          description: assistance.description,
          priority: assistance.priority,
          buildingName: assistance.buildings.name,
          buildingAddress: assistance.buildings.address,
          buildingNif: assistance.buildings.nif,
          interventionType: assistance.intervention_types.name,
          expectedCompletionDate: assistance.expected_completion_date,
          status: assistance.status
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
      template_used: 'completion_reminder',
      status: 'sent',
      metadata: {
        followup_id: followup.id,
        followup_type: followup.follow_up_type,
        expected_completion_date: assistance.expected_completion_date,
        days_overdue: daysOverdue
      }
    });

    console.log('Completion reminder email sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Completion reminder sent' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error sending completion reminder:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send completion reminder' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);