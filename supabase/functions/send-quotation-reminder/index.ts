
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuotationReminderRequest {
  assistanceId: string;
  supplierId: string;
  attemptCount: number;
  priority: string;
  metadata?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assistanceId, supplierId, attemptCount, priority }: QuotationReminderRequest = await req.json();

    console.log(`Sending quotation reminder for assistance ${assistanceId}, attempt ${attemptCount + 1}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar detalhes da assistência
    const { data: assistance, error: assistanceError } = await supabase
      .from('assistances')
      .select(`
        *,
        buildings (name, address),
        suppliers (name, email, phone),
        intervention_types (name)
      `)
      .eq('id', assistanceId)
      .single();

    if (assistanceError || !assistance) {
      throw new Error('Assistance not found');
    }

    // Gerar novo código mágico
    const { data: magicCode, error: magicError } = await supabase
      .rpc('generate_magic_code');

    if (magicError) throw magicError;

    // Armazenar código mágico
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias de validade

    await supabase
      .from('supplier_magic_codes')
      .insert({
        supplier_id: supplierId,
        magic_code: magicCode,
        expires_at: expiresAt.toISOString(),
        assistance_id: assistanceId
      });

    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://547ef223-c1fa-45ad-b53c-1ad4427f0d14.sandbox.lovable.dev';
    const portalUrl = `${APP_BASE_URL}/supplier-portal?code=${magicCode}`;
    
    const isUrgent = priority === 'urgent' || priority === 'critical';
    const urgencyColor = isUrgent ? '#ef4444' : '#f59e0b';
    const reminderNumber = attemptCount + 1;
    
    const emailSubject = `Luvimg - ${reminderNumber > 1 ? `${reminderNumber}º ` : ''}Lembrete: Orçamento Solicitado - ${assistance.title}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #5FB3B3, #7BC4C4); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="cid:logo" alt="Luvimg" style="height: 40px; width: auto; margin-bottom: 15px;" />
          <h1 style="color: white; margin: 0; font-size: 24px;">💼 ${reminderNumber > 1 ? `${reminderNumber}º Lembrete` : 'Solicitação'}: Orçamento Pendente</h1>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Olá ${assistance.suppliers.name},</p>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="color: #92400e; margin: 0; font-size: 16px; font-weight: 600;">
              📋 Solicitámos um orçamento para a seguinte assistência:
            </p>
          </div>

          <div style="background-color: #f8fafc; border-left: 4px solid ${urgencyColor}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">${assistance.title}</h3>
            
            <div style="margin: 15px 0;">
              <div style="background-color: ${urgencyColor}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 15px;">
                ${isUrgent ? '🚨' : '⚠️'} ${priority === 'critical' ? 'CRÍTICO' : priority === 'urgent' ? 'URGENTE' : 'NORMAL'}
              </div>
            </div>

            <p style="color: #6b7280; margin: 10px 0 5px 0; font-size: 14px;"><strong>🏢 Edifício:</strong> ${assistance.buildings?.name || 'N/A'}</p>
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;"><strong>🔧 Tipo:</strong> ${assistance.intervention_types?.name || 'N/A'}</p>
            
            ${assistance.quotation_deadline ? `
              <p style="color: #dc2626; margin: 15px 0 5px 0; font-size: 14px; font-weight: 600;">
                <strong>⏰ Prazo:</strong> ${new Date(assistance.quotation_deadline).toLocaleDateString('pt-PT')}
              </p>
            ` : ''}

            ${assistance.description ? `
              <p style="color: #6b7280; margin: 15px 0 5px 0; font-size: 14px;"><strong>📝 Descrição:</strong></p>
              <p style="color: #4b5563; margin: 5px 0; font-size: 14px; font-style: italic;">${assistance.description}</p>
            ` : ''}
          </div>

          <div style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0); padding: 25px; text-align: center; margin: 25px 0; border-radius: 12px; border: 2px dashed #cbd5e1;">
            <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">CÓDIGO DE ACESSO</p>
            <h2 style="color: #2563eb; font-size: 28px; margin: 10px 0; letter-spacing: 0.3em; font-weight: bold;">${magicCode}</h2>
            <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">Válido por 7 dias</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}" 
               style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              💼 Submeter Orçamento
            </a>
          </div>
          
          ${reminderNumber > 1 ? `
            <div style="background-color: #fee2e2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #b91c1c; margin: 0; font-size: 14px;">
                <strong>📞 Atenção:</strong> Este é o ${reminderNumber}º lembrete. Se não conseguir submeter o orçamento, contacte-nos para esclarecimentos.<br>
                <strong>⏰ Urgente:</strong> Caso não haja resposta em breve, a solicitação poderá ser reatribuída.
              </p>
            </div>
          ` : ''}
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
              <strong>Luvimg - Administração de Condomínios</strong><br>
              Praceta Pedro Manuel Pereira nº 1 – 1º esq, 2620-158 Póvoa Santo Adrião<br>
              Tel: +351 219 379 248 | Email: arquivo@luvimg.com<br>
              ${reminderNumber > 1 ? `${reminderNumber}º lembrete enviado` : 'Primeira solicitação'} em ${new Date().toLocaleString('pt-PT')}
            </p>
          </div>
        </div>
      </div>
    `;

    // Enviar email usando função send-email
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: assistance.suppliers.email,
        subject: emailSubject,
        html: emailHtml,
        bcc: 'arquivo@luvimg.com',
        from: 'Luvimg - Administração de Condomínios <arquivo@luvimg.com>'
      }
    });

    if (emailError) {
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

    // Registar no log de emails
    await supabase
      .from("email_logs")
      .insert({
        assistance_id: assistanceId,
        supplier_id: supplierId,
        recipient_email: assistance.suppliers.email,
        subject: emailSubject,
        template_used: 'quotation_reminder',
        status: 'sent',
        metadata: {
          reminder_number: reminderNumber,
          priority: priority,
          magic_code: magicCode
        }
      });

    // Atualizar contador de follow-ups na assistência
    await supabase
      .from('assistances')
      .update({
        quotation_follow_up_count: reminderNumber,
        last_quotation_follow_up_sent: new Date().toISOString()
      })
      .eq('id', assistanceId);

    console.log(`Quotation reminder sent successfully to ${assistance.suppliers.email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-quotation-reminder function:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
