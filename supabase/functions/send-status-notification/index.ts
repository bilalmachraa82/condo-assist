import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://547ef223-c1fa-45ad-b53c-1ad4427f0d14.lovableproject.com';
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StatusNotificationRequest {
  assistanceId: string;
  oldStatus: string;
  newStatus: string;
  assistance: {
    id: string;
    title: string;
    description?: string;
    priority: string;
    buildings?: { name: string; code: string };
    suppliers?: { name: string; email: string };
    intervention_types?: { name: string };
    supplier_notes?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assistanceId, oldStatus, newStatus, assistance }: StatusNotificationRequest = await req.json();

    console.log(`Sending status notification: ${oldStatus} → ${newStatus} for assistance ${assistanceId}`);

    // Create Supabase client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Note: Admin notification functionality simplified for now
    // We can implement admin emails later if needed
    console.log('Status notification processing for assistance:', assistanceId);

    const getStatusInfo = (status: string) => {
      const statusMap = {
        pending: { label: 'Pendente', color: '#64748b', emoji: '⏳', description: 'Aguardando ação' },
        in_progress: { label: 'Em Progresso', color: '#3b82f6', emoji: '🔧', description: 'Trabalho em execução' },
        completed: { label: 'Concluída', color: '#10b981', emoji: '✅', description: 'Trabalho finalizado' },
        cancelled: { label: 'Cancelada', color: '#ef4444', emoji: '❌', description: 'Assistência cancelada' }
      };
      return statusMap[status as keyof typeof statusMap] || { label: status, color: '#64748b', emoji: '📋', description: status };
    };

    const getPriorityInfo = (priority: string) => {
      const priorityMap = {
        normal: { label: 'Normal', color: '#10b981', emoji: '📝' },
        urgent: { label: 'Urgente', color: '#f59e0b', emoji: '⚠️' },
        critical: { label: 'Crítico', color: '#ef4444', emoji: '🚨' }
      };
      return priorityMap[priority as keyof typeof priorityMap] || { label: priority, color: '#64748b', emoji: '📋' };
    };

    const oldStatusInfo = getStatusInfo(oldStatus);
    const newStatusInfo = getStatusInfo(newStatus);
    const priorityInfo = getPriorityInfo(assistance.priority);

    // Prepare email content
    const emailSubject = `Assistência ${newStatusInfo.label} - ${assistance.title}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #5FB3B3, #7BC4C4); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="cid:luvimg-logo" alt="Luvimg" style="height: 40px; width: auto; margin-bottom: 15px;" />
          <h1 style="color: white; margin: 0; font-size: 24px;">${newStatusInfo.emoji} Status Atualizado</h1>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <div style="background-color: #f8fafc; border-left: 4px solid ${newStatusInfo.color}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📋 ${assistance.title}</h3>
            
            <div style="display: flex; align-items: center; justify-content: center; margin: 20px 0; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; flex: 1;">
                <div style="background-color: ${oldStatusInfo.color}20; color: ${oldStatusInfo.color}; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 5px;">
                  ${oldStatusInfo.emoji} ${oldStatusInfo.label}
                </div>
                <span style="color: #9ca3af; font-size: 12px;">Estado anterior</span>
              </div>
              
              <div style="margin: 0 20px; color: #64748b; font-size: 24px;">➜</div>
              
              <div style="text-align: center; flex: 1;">
                <div style="background-color: ${newStatusInfo.color}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 5px;">
                  ${newStatusInfo.emoji} ${newStatusInfo.label}
                </div>
                <span style="color: #9ca3af; font-size: 12px;">Estado atual</span>
              </div>
            </div>

            <div style="margin: 15px 0;">
              <div style="background-color: ${priorityInfo.color}20; color: ${priorityInfo.color}; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold; display: inline-block;">
                ${priorityInfo.emoji} ${priorityInfo.label}
              </div>
            </div>
            
            <p style="color: #6b7280; margin: 10px 0 5px 0; font-size: 14px;"><strong>🏢 Edifício:</strong> ${assistance.buildings?.name || 'N/A'}</p>
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;"><strong>🔧 Tipo:</strong> ${assistance.intervention_types?.name || 'N/A'}</p>
            ${assistance.suppliers?.name ? `<p style="color: #6b7280; margin: 5px 0; font-size: 14px;"><strong>👷 Fornecedor:</strong> ${assistance.suppliers.name}</p>` : ''}
            
            ${assistance.supplier_notes ? `
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>💬 Notas do Fornecedor:</strong><br>
                  ${assistance.supplier_notes}
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
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
              <strong>Luvimg - Administração de Condomínios</strong><br>
              Praceta Pedro Manuel Pereira nº 1 – 1º esq, 2620-158 Póvoa Santo Adrião<br>
              Tel: +351 219 379 248 | Email: arquivo@luvimg.com<br>
              Atualização realizada em ${new Date().toLocaleString('pt-PT')}
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email to supplier if exists and it's relevant to them
    if (assistance.suppliers?.email) {
      try {
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: assistance.suppliers.email,
            subject: emailSubject,
            html: emailHtml,
            bcc: 'arquivo@luvimg.com',
            from: 'Luvimg - Administração de Condomínios <arquivo@luvimg.com>'
          }
        });

        if (emailError) throw emailError;

        console.log(`Email sent to supplier: ${assistance.suppliers.email}`);

        // Log email
        await supabase
          .from("email_logs")
          .insert({
            assistance_id: assistanceId,
            supplier_id: assistance.suppliers.email,
            recipient_email: assistance.suppliers.email,
            subject: emailSubject,
            template_used: 'status_change_notification',
            status: 'sent',
            metadata: {
              old_status: oldStatus,
              new_status: newStatus,
              assistance_title: assistance.title
            }
          });
      } catch (error) {
        console.error("Error sending email to supplier:", error);
      }
    }

    // Note: In a real application, you would also send emails to admins
    // For now, we're focusing on supplier notifications

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-status-notification function:", error);
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