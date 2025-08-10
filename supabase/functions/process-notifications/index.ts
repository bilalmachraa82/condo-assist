import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationData {
  id: string;
  assistance_id: string;
  supplier_id: string;
  notification_type: string;
  priority: string;
  reminder_count: number;
  metadata: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing notifications...');

    // Get pending notifications that are due
    const { data: pendingNotifications, error: notificationsError } = await supabaseClient
      .from('notifications')
      .select(`
        *,
        assistances (
          id, title, description, priority, status,
          buildings (name, address, nif),
          intervention_types (name)
        ),
        suppliers (id, name, email)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      throw notificationsError;
    }

    console.log(`Found ${pendingNotifications?.length || 0} pending notifications`);

    for (const notification of pendingNotifications || []) {
      try {
        await processNotification(supabaseClient, notification);
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        
        // Mark notification as failed
        await supabaseClient
          .from('notifications')
          .update({ 
            status: 'failed',
            metadata: { 
              ...notification.metadata, 
              error: error.message,
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', notification.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: pendingNotifications?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-notifications function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

async function processNotification(supabaseClient: any, notification: NotificationData) {
  const { assistances: assistance, suppliers: supplier } = notification;
  
  if (!assistance || !supplier) {
    console.log(`Skipping notification ${notification.id} - missing assistance or supplier data`);
    return;
  }

  let emailSubject = '';
  let emailContent = '';

  // Generate email content based on notification type
  switch (notification.notification_type) {
    case 'reminder':
      const reminderType = notification.reminder_count === 1 ? 'Primeiro' : 'Segundo';
      emailSubject = `${reminderType} Lembrete: Assistência Pendente - ${assistance.title}`;
      emailContent = generateReminderEmail(assistance, supplier, notification);
      break;
      
    case 'escalation':
      emailSubject = `ESCALAÇÃO: Assistência sem resposta - ${assistance.title}`;
      emailContent = generateEscalationEmail(assistance, supplier, notification);
      break;
      
    default:
      console.log(`Unknown notification type: ${notification.notification_type}`);
      return;
  }

  // Send email via send-email function
  const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
    body: {
      to: supplier.email,
      subject: emailSubject,
      html: emailContent,
      assistance_id: assistance.id,
      supplier_id: supplier.id,
      email_type: notification.notification_type
    }
  });

  if (emailError) {
    console.error('Error sending email:', emailError);
    throw emailError;
  }

  // Mark notification as sent
  await supabaseClient
    .from('notifications')
    .update({ 
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: {
        ...notification.metadata,
        sent_to: supplier.email,
        email_subject: emailSubject
      }
    })
    .eq('id', notification.id);

  // Log activity
  await supabaseClient
    .from('activity_log')
    .insert({
      assistance_id: assistance.id,
      supplier_id: supplier.id,
      action: `${notification.notification_type}_sent`,
      details: `${notification.notification_type === 'reminder' ? 'Lembrete' : 'Escalação'} enviado para ${supplier.name}`,
      metadata: {
        notification_id: notification.id,
        reminder_count: notification.reminder_count,
        email_subject: emailSubject
      }
    });

  console.log(`Successfully processed ${notification.notification_type} for assistance ${assistance.id}`);
}

function generateReminderEmail(assistance: any, supplier: any, notification: any): string {
  const building = assistance.buildings;
  const interventionType = assistance.intervention_types;
  const reminderText = notification.reminder_count === 1 ? 'primeiro' : 'segundo';
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #e11d48;">🔔 ${notification.reminder_count === 1 ? 'Primeiro' : 'Segundo'} Lembrete - Assistência Pendente</h2>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p><strong>Olá ${supplier.name},</strong></p>
            <p>Este é o <strong>${reminderText} lembrete</strong> sobre uma assistência pendente que requer a sua atenção:</p>
          </div>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <h3 style="margin-top: 0; color: #374151;">Detalhes da Assistência</h3>
            <p><strong>Título:</strong> ${assistance.title}</p>
            <p><strong>Prioridade:</strong> <span style="color: ${getPriorityColor(assistance.priority)};">${getPriorityText(assistance.priority)}</span></p>
            <p><strong>Tipo:</strong> ${interventionType?.name || 'N/A'}</p>
            <p><strong>Edifício:</strong> ${building?.name || 'N/A'}</p>
            <p><strong>Endereço:</strong> ${building?.address || 'N/A'}</p>
            <p><strong>NIF:</strong> ${building?.nif || 'N/A'}</p>
            <p><strong>Descrição:</strong> ${assistance.description || 'N/A'}</p>
          </div>

          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p><strong>⚠️ Ação Necessária:</strong></p>
            <p>Por favor, responda a esta assistência o mais brevemente possível. ${notification.reminder_count === 2 ? 'Este é o último lembrete antes da escalação automática.' : ''}</p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${getSupplierPortalUrl()}" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Aceder ao Portal do Fornecedor
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            Se tem alguma questão, entre em contacto connosco.<br>
            Este email foi enviado automaticamente pelo sistema de gestão de assistências.
          </p>
        </div>
      </body>
    </html>
  `;
}

function generateEscalationEmail(assistance: any, supplier: any, notification: any): string {
  const building = assistance.buildings;
  const interventionType = assistance.intervention_types;
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">🚨 ESCALAÇÃO - Assistência sem Resposta</h2>
          
          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p><strong>Olá ${supplier.name},</strong></p>
            <p><strong>Esta assistência foi escalada</strong> devido à falta de resposta dentro do prazo estabelecido.</p>
          </div>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <h3 style="margin-top: 0; color: #374151;">Detalhes da Assistência</h3>
            <p><strong>Título:</strong> ${assistance.title}</p>
            <p><strong>Prioridade:</strong> <span style="color: ${getPriorityColor(assistance.priority)};">${getPriorityText(assistance.priority)}</span></p>
            <p><strong>Tipo:</strong> ${interventionType?.name || 'N/A'}</p>
            <p><strong>Edifício:</strong> ${building?.name || 'N/A'}</p>
            <p><strong>Endereço:</strong> ${building?.address || 'N/A'}</p>
            <p><strong>NIF:</strong> ${building?.nif || 'N/A'}</p>
            <p><strong>Descrição:</strong> ${assistance.description || 'N/A'}</p>
          </div>

          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p><strong>⚠️ ESCALAÇÃO ATIVA:</strong></p>
            <p>Esta assistência foi reportada à administração devido à falta de resposta. Por favor, responda <strong>imediatamente</strong> para evitar futuras consequências.</p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${getSupplierPortalUrl()}" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Responder AGORA
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            Este email foi enviado automaticamente pelo sistema de gestão de assistências.<br>
            A administração foi notificada sobre esta escalação.
          </p>
        </div>
      </body>
    </html>
  `;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return '#dc2626';
    case 'urgent': return '#ea580c';
    case 'normal': return '#059669';
    default: return '#6b7280';
  }
}

function getPriorityText(priority: string): string {
  switch (priority) {
    case 'critical': return 'CRÍTICA';
    case 'urgent': return 'URGENTE';
    case 'normal': return 'NORMAL';
    default: return priority.toUpperCase();
  }
}

function getSupplierPortalUrl(): string {
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'https://547ef223-c1fa-45ad-b53c-1ad4427f0d14.lovableproject.com';
  return `${baseUrl}/supplier-portal`;
}

serve(handler);