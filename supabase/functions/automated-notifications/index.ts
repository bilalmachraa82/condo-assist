import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "assignment" | "reminder" | "escalation" | "status_update";
  assistance_id: string;
  supplier_id?: string;
  delay_hours?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, assistance_id, supplier_id, delay_hours }: NotificationRequest = await req.json();

    console.log(`Processing automated notification: ${type} for assistance ${assistance_id}`);

    // Get assistance details
    const { data: assistance, error: assistanceError } = await supabase
      .from('assistances')
      .select(`
        *,
        buildings(name, address),
        intervention_types(name)
      `)
      .eq('id', assistance_id)
      .single();

    if (assistanceError || !assistance) {
      throw new Error(`Failed to fetch assistance: ${assistanceError?.message}`);
    }

    // Get supplier details separately if supplier_id is provided
    let supplier = null;
    if (supplier_id || assistance.assigned_supplier_id) {
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('id, name, email')
        .eq('id', supplier_id || assistance.assigned_supplier_id)
        .single();
      
      if (!supplierError && supplierData) {
        supplier = supplierData;
      }
    }


    let emailSubject = "";
    let emailContent = "";
    let recipientEmail = "";

    switch (type) {
      case "assignment":
        if (!supplier?.email) {
          throw new Error("No supplier email found for assignment notification");
        }
        
        recipientEmail = supplier.email;
        emailSubject = `Nova Assistência Atribuída - ${assistance.title}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Nova Assistência Atribuída</h1>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">${assistance.title}</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #667eea; margin-top: 0;">Detalhes da Assistência</h3>
                <p><strong>Prioridade:</strong> <span style="color: ${assistance.priority === 'critical' ? '#dc3545' : assistance.priority === 'urgent' ? '#fd7e14' : '#28a745'}">${assistance.priority}</span></p>
                <p><strong>Edifício:</strong> ${assistance.buildings?.name}</p>
                <p><strong>Morada:</strong> ${assistance.buildings?.address}</p>
                <p><strong>Tipo:</strong> ${assistance.intervention_types?.name}</p>
                <p><strong>Descrição:</strong> ${assistance.description || 'Sem descrição'}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://zmpitnpmplemfozvtbam.supabase.co/supplier-portal" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Aceder ao Portal do Fornecedor
                </a>
              </div>
              
              <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px; color: #6c757d;">
                  <strong>Importante:</strong> Por favor, responda a esta assistência no prazo de 24 horas.
                </p>
              </div>
            </div>
            
            <div style="background: #343a40; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0;">Luvimg - Administração de Condomínios</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">arquivo@luvimg.com</p>
            </div>
          </div>
        `;
        break;

      case "reminder":
        if (!supplier?.email) {
          throw new Error("No supplier email found for reminder notification");
        }
        
        recipientEmail = supplier.email;
        emailSubject = `Lembrete: Assistência Pendente - ${assistance.title}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Lembrete de Assistência</h1>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <p>Caro fornecedor,</p>
              <p>Este é um lembrete de que tem uma assistência pendente que requer a sua atenção:</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h3 style="color: #333; margin-top: 0;">${assistance.title}</h3>
                <p><strong>Prioridade:</strong> <span style="color: ${assistance.priority === 'critical' ? '#dc3545' : assistance.priority === 'urgent' ? '#fd7e14' : '#28a745'}">${assistance.priority}</span></p>
                <p><strong>Edifício:</strong> ${assistance.buildings?.name}</p>
                <p><strong>Data de Criação:</strong> ${new Date(assistance.created_at).toLocaleDateString('pt-PT')}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://zmpitnpmplemfozvtbam.supabase.co/supplier-portal" style="background: #ffc107; color: #333; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Responder Agora
                </a>
              </div>
              
              <p style="color: #6c757d; font-size: 14px;">
                Por favor, aceda ao portal do fornecedor para responder a esta assistência.
              </p>
            </div>
            
            <div style="background: #343a40; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0;">Luvimg - Administração de Condomínios</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">arquivo@luvimg.com</p>
            </div>
          </div>
        `;
        break;

      case "escalation":
        // For escalation, send to admin instead of supplier
        const { data: admins } = await supabase
          .from('profiles')
          .select('user_id')
          .in('user_id', 
            await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'admin')
              .then(res => res.data?.map(r => r.user_id) || [])
          );

        // For now, send to a default admin email
        recipientEmail = "admin@luvimg.com";
        emailSubject = `ESCALAÇÃO: Assistência Crítica Sem Resposta - ${assistance.title}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">⚠️ ESCALAÇÃO AUTOMÁTICA</h1>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <strong>ATENÇÃO:</strong> A seguinte assistência crítica não recebeu resposta do fornecedor e foi automaticamente escalada.
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545;">
                <h3 style="color: #333; margin-top: 0;">${assistance.title}</h3>
                <p><strong>Fornecedor:</strong> ${supplier?.name || 'N/A'}</p>
                <p><strong>Email:</strong> ${supplier?.email || 'N/A'}</p>
                <p><strong>Prioridade:</strong> <span style="color: #dc3545">${assistance.priority}</span></p>
                <p><strong>Edifício:</strong> ${assistance.buildings?.name}</p>
                <p><strong>Data de Criação:</strong> ${new Date(assistance.created_at).toLocaleDateString('pt-PT')}</p>
                <p><strong>Tempo Sem Resposta:</strong> Mais de ${delay_hours || 48} horas</p>
              </div>
              
              <div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <strong>Ação Recomendada:</strong> Contactar o fornecedor diretamente ou atribuir a assistência a outro fornecedor.
              </div>
            </div>
            
            <div style="background: #343a40; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0;">Sistema Automático - Luvimg</p>
            </div>
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    // Send email using the send-email function
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject: emailSubject,
        html: emailContent,
        from: "Luvimg - Administração de Condomínios <arquivo@luvimg.com>"
      }
    });

    if (emailError) {
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    // Log the email
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: recipientEmail,
        subject: emailSubject,
        status: 'sent',
        template_used: `automated_${type}`,
        assistance_id: assistance_id,
        supplier_id: supplier_id,
        metadata: {
          automation_type: type,
          delay_hours: delay_hours,
          sent_via: 'automated-notifications'
        }
      });

    if (logError) {
      console.error('Failed to log email:', logError);
    }

    // Create activity log entry
    const { error: activityError } = await supabase
      .from('activity_log')
      .insert({
        assistance_id: assistance_id,
        supplier_id: supplier_id,
        action: `automated_${type}_sent`,
        details: `Email automático enviado: ${emailSubject}`,
        metadata: {
          email_type: type,
          recipient: recipientEmail,
          delay_hours: delay_hours
        }
      });

    if (activityError) {
      console.error('Failed to log activity:', activityError);
    }

    console.log(`Automated notification sent successfully: ${type} to ${recipientEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${type} notification sent to ${recipientEmail}`,
        email_result: emailResult
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in automated-notifications function:", error);
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