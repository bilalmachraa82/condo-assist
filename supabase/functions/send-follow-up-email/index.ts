import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FollowUpRequest {
  assistanceId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assistanceId }: FollowUpRequest = await req.json();

    console.log(`Sending follow-up email for assistance ${assistanceId}`);

    // Create Supabase client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get assistance details
    const { data: assistance, error: assistanceError } = await supabase
      .from('assistances')
      .select(`
        *,
        buildings (name, code),
        suppliers (name, email),
        intervention_types (name)
      `)
      .eq('id', assistanceId)
      .single();

    if (assistanceError) {
      console.error('Error fetching assistance:', assistanceError);
      throw assistanceError;
    }

    if (!assistance.suppliers?.email || !assistance.suppliers?.name) {
      throw new Error('Supplier email or name not found');
    }

    const followUpCount = assistance.follow_up_count || 0;
    const isUrgent = assistance.priority === 'urgent' || assistance.priority === 'critical';
    const urgencyColor = isUrgent ? '#ef4444' : '#f59e0b';

    // Generate new magic code for follow-up access
    const { data: magicCode, error: magicError } = await supabase
      .rpc('generate_magic_code');

    if (magicError) throw magicError;

    // Store magic code
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase
      .from('supplier_magic_codes')
      .insert({
        supplier_id: assistance.assigned_supplier_id,
        magic_code: magicCode,
        expires_at: expiresAt.toISOString(),
        assistance_id: assistanceId
      });

    const emailSubject = `Luvimg - LEMBRETE: Assistência Pendente ${followUpCount > 0 ? `(${followUpCount + 1}º Lembrete)` : ''} - ${assistance.title}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #5FB3B3, #7BC4C4); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png" alt="Luvimg" style="height: 40px; width: auto; margin-bottom: 15px;" />
          <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Lembrete: Resposta Pendente</h1>
          ${followUpCount > 0 ? `<p style="color: white; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${followUpCount + 1}º Lembrete</p>` : ''}
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Olá ${assistance.suppliers.name},</p>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="color: #92400e; margin: 0; font-size: 16px; font-weight: 600;">
              ⚠️ Aguardamos a sua resposta para a assistência abaixo:
            </p>
          </div>

          <div style="background-color: #f8fafc; border-left: 4px solid ${urgencyColor}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📋 ${assistance.title}</h3>
            
            <div style="margin: 15px 0;">
              <div style="background-color: ${urgencyColor}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 15px;">
                ${isUrgent ? '🚨' : '⚠️'} ${assistance.priority === 'critical' ? 'CRÍTICO' : assistance.priority === 'urgent' ? 'URGENTE' : 'NORMAL'}
              </div>
            </div>

            <p style="color: #6b7280; margin: 10px 0 5px 0; font-size: 14px;"><strong>🏢 Edifício:</strong> ${assistance.buildings?.name || 'N/A'}</p>
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;"><strong>🔧 Tipo:</strong> ${assistance.intervention_types?.name || 'N/A'}</p>
            
            ${assistance.response_deadline ? `
              <p style="color: #dc2626; margin: 15px 0 5px 0; font-size: 14px; font-weight: 600;">
                <strong>⏰ Prazo de Resposta:</strong> ${new Date(assistance.response_deadline).toLocaleDateString('pt-PT')}
              </p>
            ` : ''}

            ${assistance.description ? `
              <p style="color: #6b7280; margin: 15px 0 5px 0; font-size: 14px;"><strong>📝 Descrição:</strong></p>
              <p style="color: #4b5563; margin: 5px 0; font-size: 14px; font-style: italic;">${assistance.description}</p>
            ` : ''}
          </div>

          <div style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0); padding: 25px; text-align: center; margin: 25px 0; border-radius: 12px; border: 2px dashed #cbd5e1;">
            <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">CÓDIGO DE ACESSO ATUALIZADO</p>
            <h2 style="color: #2563eb; font-size: 28px; margin: 10px 0; letter-spacing: 0.3em; font-weight: bold;">${magicCode}</h2>
            <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">Válido por 24 horas</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://zmpitnpmplemfozvtbam.supabase.co/supplier-portal?code=${magicCode}" 
               style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); margin-right: 10px;">
              ✅ Aceitar Assistência
            </a>
            <a href="https://zmpitnpmplemfozvtbam.supabase.co/supplier-portal?code=${magicCode}" 
               style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              ❌ Recusar Assistência
            </a>
          </div>
          
          <div style="background-color: #fee2e2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #b91c1c; margin: 0; font-size: 14px;">
              <strong>📞 Contacto Urgente:</strong> Se precisar de esclarecimentos adicionais, entre em contacto connosco imediatamente.<br>
              <strong>⏰ Ação Necessária:</strong> Por favor, responda o mais breve possível para evitarmos ter de atribuir esta assistência a outro fornecedor.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
              <strong>Luvimg - Administração de Condomínios</strong><br>
              Praceta Pedro Manuel Pereira nº 1 – 1º esq, 2620-158 Póvoa Santo Adrião<br>
              Tel: +351 219 379 248 | Email: arquivo@luvimg.com<br>
              ${followUpCount > 0 ? `Este é o ${followUpCount + 1}º lembrete. ` : ''}Lembrete enviado em ${new Date().toLocaleString('pt-PT')}
            </p>
          </div>
        </div>
      </div>
    `;

    // Send follow-up email to supplier
    await resend.emails.send({
      from: "Luvimg - Administração de Condomínios <arquivo@luvimg.com>",
      to: [assistance.suppliers.email],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log(`Follow-up email sent to supplier: ${assistance.suppliers.email}`);

    // Log email
    await supabase
      .from("email_logs")
      .insert({
        assistance_id: assistanceId,
        supplier_id: assistance.assigned_supplier_id,
        recipient_email: assistance.suppliers.email,
        subject: emailSubject,
        template_used: 'follow_up_reminder',
        status: 'sent',
        metadata: {
          follow_up_count: followUpCount + 1,
          priority: assistance.priority,
          assistance_title: assistance.title
        }
      });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-follow-up-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);