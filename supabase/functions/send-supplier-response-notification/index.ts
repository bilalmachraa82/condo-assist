import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://547ef223-c1fa-45ad-b53c-1ad4427f0d14.sandbox.lovable.dev';
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResponseNotificationRequest {
  assistanceId: string;
  supplierId: string;
  responseType: 'accepted' | 'declined';
  responseData: {
    decline_reason?: string;
    estimated_completion_date?: string;
    notes?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assistanceId, supplierId, responseType, responseData }: ResponseNotificationRequest = await req.json();

    console.log(`Sending supplier response notification: ${responseType} for assistance ${assistanceId}`);

    // Create Supabase client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get assistance and supplier details
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

    // Get admin emails for notifications
    const { data: adminUsers, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error fetching admin users:', adminError);
    }

    const isAccepted = responseType === 'accepted';
    const statusColor = isAccepted ? '#5FB3B3' : '#ef4444'; // Cor primária da Luvimg
    const statusEmoji = isAccepted ? '✅' : '❌';
    const actionText = isAccepted ? 'ACEITE' : 'RECUSADA';
    const luvimgLogo = 'https://547ef223-c1fa-45ad-b53c-1ad4427f0d14.sandbox.lovable.dev/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png'; // Logo oficial Luvimg

    // Prepare email content
    const emailSubject = `Luvimg - Resposta do Fornecedor: ${actionText} - ${assistance.title}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #5FB3B3, #7BC4C4); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="cid:logo" alt="Luvimg" style="height: 40px; width: auto; margin-bottom: 15px;" />
          <h1 style="color: white; margin: 0; font-size: 24px;">${statusEmoji} Resposta do Fornecedor</h1>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <div style="background-color: #f8fafc; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📋 ${assistance.title}</h3>
            
            <div style="text-align: center; margin: 20px 0; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="background-color: ${statusColor}; color: white; padding: 12px 24px; border-radius: 25px; font-size: 16px; font-weight: bold; display: inline-block;">
                ${statusEmoji} ASSISTÊNCIA ${actionText}
              </div>
              <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">
                Resposta enviada pelo fornecedor ${assistance.suppliers?.name}
              </p>
            </div>

            <div style="margin: 15px 0;">
              <p style="color: #6b7280; margin: 5px 0; font-size: 14px;"><strong>🏢 Edifício:</strong> ${assistance.buildings?.name || 'N/A'}</p>
              <p style="color: #6b7280; margin: 5px 0; font-size: 14px;"><strong>🔧 Tipo:</strong> ${assistance.intervention_types?.name || 'N/A'}</p>
              <p style="color: #6b7280; margin: 5px 0; font-size: 14px;"><strong>👷 Fornecedor:</strong> ${assistance.suppliers?.name || 'N/A'}</p>
            </div>
            
            ${!isAccepted && responseData.decline_reason ? `
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="color: #b91c1c; margin: 0; font-size: 14px;">
                  <strong>💬 Motivo da Recusa:</strong><br>
                  ${responseData.decline_reason}
                </p>
              </div>
            ` : ''}

            ${isAccepted && responseData.estimated_completion_date ? `
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="color: #166534; margin: 0; font-size: 14px;">
                  <strong>📅 Data Estimada de Conclusão:</strong><br>
                  ${new Date(responseData.estimated_completion_date).toLocaleDateString('pt-PT')}
                </p>
              </div>
            ` : ''}

            ${responseData.notes ? `
              <div style="background-color: #fefce8; border: 1px solid #fde047; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="color: #a16207; margin: 0; font-size: 14px;">
                  <strong>📝 Notas do Fornecedor:</strong><br>
                  ${responseData.notes}
                </p>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_BASE_URL}/assistencias/${assistanceId}" 
               style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              🔍 Ver Assistência
            </a>
          </div>

          ${!isAccepted ? `
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                ⚠️ <strong>Ação Necessária:</strong> Esta assistência foi recusada. Considere atribuir a outro fornecedor ou contactar o fornecedor para mais informações.
              </p>
            </div>
          ` : `
            <div style="background-color: #dcfce7; border: 1px solid #16a34a; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #15803d; margin: 0; font-size: 14px;">
                ✅ <strong>Boas Notícias:</strong> O fornecedor aceitou a assistência e irá iniciar o trabalho brevemente.
              </p>
            </div>
          `}
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
              <strong>Luvimg - Administração de Condomínios</strong><br>
              Praceta Pedro Manuel Pereira nº 1 – 1º esq, 2620-158 Póvoa Santo Adrião<br>
              Tel: +351 219 379 248 | Email: arquivo@luvimg.com<br>
              Resposta registada em ${new Date().toLocaleString('pt-PT')}
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email to admins (simplified - you'd want to get actual admin emails)
    const adminEmail = "admin@example.com"; // In production, get from admin users
    
    try {
      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: [adminEmail],
          subject: emailSubject,
          html: emailHtml,
          bcc: 'arquivo@luvimg.com',
          from: 'Luvimg - Administração de Condomínios <arquivo@luvimg.com>'
        }
      });

      if (emailError) throw emailError;

      console.log(`Response notification email sent to admins`);

      // Log email
      await supabase
        .from("email_logs")
        .insert({
          assistance_id: assistanceId,
          supplier_id: supplierId,
          recipient_email: adminEmail,
          subject: emailSubject,
          template_used: 'supplier_response_notification',
          status: 'sent',
          metadata: {
            response_type: responseType,
            assistance_title: assistance.title
          }
        });
    } catch (error) {
      console.error("Error sending response notification email:", error);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-supplier-response-notification function:", error);
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