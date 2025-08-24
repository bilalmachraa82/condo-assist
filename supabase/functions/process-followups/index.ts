
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FollowUpRecord {
  id: string;
  assistance_id: string;
  supplier_id: string;
  follow_up_type: string;
  priority: string;
  scheduled_for: string;
  attempt_count: number;
  max_attempts: number;
  metadata: any;
  title: string;
  description: string;
  supplier_name: string;
  supplier_email: string;
  building_name: string;
  scheduled_start_date?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting follow-up processing...");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar follow-ups pendentes
    const { data: followups, error: followupsError } = await supabase
      .from('follow_up_schedules')
      .select(`
        *,
        assistances!inner (
          title,
          description,
          priority,
          scheduled_start_date,
          buildings!inner (name)
        ),
        suppliers!inner (
          name,
          email
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempt_count', 3)
      .order('scheduled_for', { ascending: true })
      .limit(20);

    if (followupsError) {
      console.error('Error fetching follow-ups:', followupsError);
      throw followupsError;
    }

    console.log(`Found ${followups?.length || 0} follow-ups to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const followup of followups || []) {
      try {
        console.log(`Processing follow-up ${followup.id} - Type: ${followup.follow_up_type}`);

        // Marcar como processando
        await supabase
          .from('follow_up_schedules')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', followup.id);

        // Determinar tipo de email e enviar
        let emailSent = false;
        
        switch (followup.follow_up_type) {
          case 'quotation_reminder':
            emailSent = await sendQuotationReminder(supabase, followup);
            break;
          case 'date_confirmation':
            emailSent = await sendDateConfirmation(supabase, followup);
            break;
          case 'work_reminder':
            emailSent = await sendWorkReminder(supabase, followup);
            break;
          case 'completion_reminder':
            emailSent = await sendCompletionReminder(supabase, followup);
            break;
        }

        if (emailSent) {
          // Atualizar como enviado
          await supabase
            .from('follow_up_schedules')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              attempt_count: followup.attempt_count + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', followup.id);

          processedCount++;
        } else {
          // Marcar falha e agendar nova tentativa
          const nextAttempt = followup.attempt_count + 1 < followup.max_attempts 
            ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // +4 horas
            : null;

          await supabase
            .from('follow_up_schedules')
            .update({
              status: 'failed',
              attempt_count: followup.attempt_count + 1,
              next_attempt_at: nextAttempt,
              updated_at: new Date().toISOString()
            })
            .eq('id', followup.id);

          errorCount++;
        }

      } catch (error) {
        console.error(`Error processing follow-up ${followup.id}:`, error);
        errorCount++;

        // Marcar como falhado
        await supabase
          .from('follow_up_schedules')
          .update({
            status: 'failed',
            attempt_count: followup.attempt_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', followup.id);
      }
    }

    console.log(`Follow-up processing complete. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: followups?.length || 0
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in process-followups function:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function sendQuotationReminder(supabase: any, followup: any): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-quotation-reminder', {
      body: {
        assistanceId: followup.assistance_id,
        supplierId: followup.supplier_id,
        attemptCount: followup.attempt_count,
        priority: followup.priority,
        metadata: followup.metadata
      }
    });

    if (error) {
      console.error('Error sending quotation reminder:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send quotation reminder:', error);
    return false;
  }
}

async function sendDateConfirmation(supabase: any, followup: any): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-date-confirmation', {
      body: {
        assistanceId: followup.assistance_id,
        supplierId: followup.supplier_id,
        metadata: followup.metadata
      }
    });

    if (error) {
      console.error('Error sending date confirmation:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send date confirmation:', error);
    return false;
  }
}

async function sendWorkReminder(supabase: any, followup: any): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-work-reminder', {
      body: {
        assistanceId: followup.assistance_id,
        supplierId: followup.supplier_id,
        workDate: followup.metadata?.work_date,
        metadata: followup.metadata
      }
    });

    if (error) {
      console.error('Error sending work reminder:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send work reminder:', error);
    return false;
  }
}

async function sendCompletionReminder(supabase: any, followup: any): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-completion-reminder', {
      body: {
        assistanceId: followup.assistance_id,
        supplierId: followup.supplier_id,
        expectedCompletion: followup.metadata?.expected_completion,
        metadata: followup.metadata
      }
    });

    if (error) {
      console.error('Error sending completion reminder:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send completion reminder:', error);
    return false;
  }
}

serve(handler);
