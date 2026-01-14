import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssistanceData {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  created_at: string;
  requires_quotation?: boolean | null;
  quotation_deadline?: string | null;
  assistance_number?: number;
  buildings?: {
    code: string;
    name: string;
    address?: string | null;
    nif?: string | null;
  };
  intervention_types?: {
    name: string;
    category?: string | null;
  };
  suppliers?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    specialization?: string | null;
  };
}

interface RequestBody {
  assistanceId: string;
  adminEmail?: string;
  magicCode?: string;
}

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    normal: "Normal",
    urgent: "Urgente",
    critical: "Crítica",
  };
  return labels[priority] || priority;
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case "critical": return "#dc2626";
    case "urgent": return "#f59e0b";
    default: return "#3b82f6";
  }
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const generatePDFHtml = (assistance: AssistanceData): string => {
  const priorityColor = getPriorityColor(assistance.priority);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Assistência #${assistance.assistance_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; color: #1e40af; font-size: 24px; }
    .header p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
    .banner { background: #dbeafe; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px; }
    .banner.urgent { background: #fef3c7; }
    .banner.critical { background: #fee2e2; }
    .banner h2 { margin: 5px 0 0 0; font-size: 28px; color: #1e40af; }
    .priority-badge { background: ${priorityColor}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; }
    .section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
    .section.supplier { background: #ecfdf5; border-color: #a7f3d0; }
    .section.quotation { background: #fef3c7; border-color: #fcd34d; }
    .section h4 { margin: 0 0 15px 0; color: #1e40af; font-size: 16px; }
    .section.supplier h4 { color: #059669; }
    .section.quotation h4 { color: #b45309; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 0; }
    td:first-child { color: #666; width: 30%; }
    .instructions { background: #eff6ff; padding: 20px; border-radius: 8px; border: 2px dashed #3b82f6; margin-top: 30px; }
    .instructions h4 { margin: 0 0 10px 0; color: #1e40af; }
    .instructions ol { margin: 0; padding-left: 20px; color: #1e3a8a; line-height: 1.8; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>LUVIMG - Gestão de Condomínios</h1>
    <p>Pedido de Assistência para Reencaminhar</p>
    <p style="font-size: 12px; color: #999; margin-top: 10px;">Gerado em: ${formatDate(new Date().toISOString())}</p>
  </div>

  <div class="banner ${assistance.priority}">
    <span style="font-size: 14px; color: #666;">Assistência Nº</span>
    <h2>${assistance.assistance_number || "N/A"}</h2>
    <div style="margin-top: 10px;">
      <span class="priority-badge">${getPriorityLabel(assistance.priority)}</span>
    </div>
  </div>

  <div style="margin-bottom: 25px;">
    <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 18px;">${assistance.title}</h3>
    ${assistance.description ? `<p style="margin: 0; color: #666; line-height: 1.6; white-space: pre-wrap;">${assistance.description}</p>` : ""}
  </div>

  <div class="section">
    <h4>📍 Informação do Edifício</h4>
    <table>
      <tr><td>Código:</td><td><strong>${assistance.buildings?.code || "N/A"}</strong></td></tr>
      <tr><td>Nome:</td><td><strong>${assistance.buildings?.name || "N/A"}</strong></td></tr>
      ${assistance.buildings?.nif ? `<tr><td>NIF:</td><td>${assistance.buildings.nif}</td></tr>` : ""}
      ${assistance.buildings?.address ? `<tr><td>Morada:</td><td>${assistance.buildings.address}</td></tr>` : ""}
    </table>
  </div>

  <div class="section">
    <h4>🔧 Tipo de Intervenção</h4>
    <p style="margin: 0;"><strong>${assistance.intervention_types?.name || "N/A"}</strong>${assistance.intervention_types?.category ? ` (${assistance.intervention_types.category})` : ""}</p>
  </div>

  ${assistance.suppliers ? `
  <div class="section supplier">
    <h4>👷 Fornecedor Atribuído</h4>
    <table>
      <tr><td>Nome:</td><td><strong>${assistance.suppliers.name}</strong></td></tr>
      ${assistance.suppliers.email ? `<tr><td>Email:</td><td>${assistance.suppliers.email}</td></tr>` : ""}
      ${assistance.suppliers.phone ? `<tr><td>Telefone:</td><td>${assistance.suppliers.phone}</td></tr>` : ""}
      ${assistance.suppliers.specialization ? `<tr><td>Especialização:</td><td>${assistance.suppliers.specialization}</td></tr>` : ""}
    </table>
  </div>
  ` : ""}

  ${assistance.requires_quotation ? `
  <div class="section quotation">
    <h4>💰 Orçamento Requerido</h4>
    <p style="margin: 0; color: #92400e;">
      Esta assistência requer orçamento antes de iniciar.
      ${assistance.quotation_deadline ? ` Prazo: <strong>${formatDate(assistance.quotation_deadline)}</strong>` : ""}
    </p>
  </div>
  ` : ""}

  <div class="instructions">
    <h4>📧 Instruções para Reencaminhamento</h4>
    <ol>
      <li>Reveja os detalhes desta assistência</li>
      <li>Reencaminhe este email para o fornecedor: <strong>${assistance.suppliers?.email || "N/A"}</strong></li>
      <li>O código de acesso ao portal está incluído no corpo deste email</li>
      <li>O fornecedor poderá aceder ao portal para responder/agendar</li>
    </ol>
  </div>

  <div class="footer">
    <p>LUVIMG - Gestão de Condomínios | arquivo@luvimg.com</p>
    <p>Documento gerado automaticamente pelo sistema de gestão de assistências</p>
  </div>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-assistance-pdf-to-admin function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assistanceId, adminEmail, magicCode }: RequestBody = await req.json();

    if (!assistanceId) {
      throw new Error("assistanceId is required");
    }

    console.log(`Fetching assistance data for ID: ${assistanceId}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch assistance with related data
    const { data: assistance, error: fetchError } = await supabase
      .from("assistances")
      .select(`
        id,
        title,
        description,
        priority,
        status,
        created_at,
        requires_quotation,
        quotation_deadline,
        assistance_number,
        buildings (code, name, address, nif),
        intervention_types (name, category),
        suppliers:assigned_supplier_id (id, name, email, phone, specialization)
      `)
      .eq("id", assistanceId)
      .single();

    if (fetchError || !assistance) {
      console.error("Error fetching assistance:", fetchError);
      throw new Error(`Failed to fetch assistance: ${fetchError?.message || "Not found"}`);
    }

    console.log("Assistance fetched:", assistance.title);

    // Get admin email from settings if not provided
    let targetEmail = adminEmail || "arquivo@luvimg.com";
    
    if (!adminEmail) {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "admin_email")
        .single();
      
      if (setting?.value) {
        targetEmail = typeof setting.value === "string" 
          ? setting.value.replace(/"/g, "") 
          : setting.value;
      }
    }

    console.log(`Sending PDF to admin email: ${targetEmail}`);

    // Generate HTML for PDF
    const pdfHtml = generatePDFHtml(assistance as AssistanceData);

    // Build email body
    const priorityEmoji = assistance.priority === "critical" ? "🔴" : 
                         assistance.priority === "urgent" ? "🟡" : "🟢";
    
    let emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">${priorityEmoji} Nova Assistência para Reencaminhar</h2>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Assistência #${assistance.assistance_number}:</strong> ${assistance.title}</p>
          <p><strong>Prioridade:</strong> ${getPriorityLabel(assistance.priority)}</p>
          <p><strong>Edifício:</strong> ${assistance.buildings?.code} - ${assistance.buildings?.name}</p>
          <p><strong>Fornecedor:</strong> ${assistance.suppliers?.name || "Não atribuído"}</p>
          ${assistance.suppliers?.email ? `<p><strong>Email do Fornecedor:</strong> ${assistance.suppliers.email}</p>` : ""}
        </div>
    `;

    if (magicCode) {
      emailBody += `
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #f59e0b;">
          <h3 style="color: #b45309; margin-top: 0;">🔑 Código de Acesso ao Portal</h3>
          <p style="font-size: 24px; font-family: monospace; background: white; padding: 15px; text-align: center; border-radius: 4px; letter-spacing: 4px;">
            <strong>${magicCode}</strong>
          </p>
          <p style="color: #92400e; font-size: 14px;">
            Inclua este código ao reencaminhar para o fornecedor. 
            O fornecedor pode aceder ao portal em: <a href="https://condo-assist.lovable.app/fornecedor">Portal do Fornecedor</a>
          </p>
        </div>
      `;
    }

    emailBody += `
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">📋 Próximos Passos</h3>
          <ol style="color: #1e3a8a; line-height: 1.8;">
            <li>Reveja o PDF anexado com todos os detalhes</li>
            <li>Reencaminhe este email para: <strong>${assistance.suppliers?.email || "fornecedor"}</strong></li>
            <li>Certifique-se de incluir o código de acesso</li>
          </ol>
        </div>
        
        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
          Este email foi gerado automaticamente pelo sistema LUVIMG.
        </p>
      </div>
    `;

    // Send email with HTML as attachment
    const emailResponse = await resend.emails.send({
      from: "LUVIMG Assistências <onboarding@resend.dev>",
      to: [targetEmail],
      subject: `${priorityEmoji} [Assistência #${assistance.assistance_number}] ${assistance.title} - Para Reencaminhar`,
      html: emailBody,
      attachments: [
        {
          filename: `assistencia-${assistance.assistance_number}.html`,
          content: Buffer.from(pdfHtml).toString("base64"),
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the email
    await supabase.from("email_logs").insert({
      recipient_email: targetEmail,
      subject: `[Assistência #${assistance.assistance_number}] ${assistance.title}`,
      template_used: "admin_pdf_forward",
      status: "sent",
      assistance_id: assistanceId,
      supplier_id: assistance.suppliers?.id || null,
      metadata: {
        email_mode: "admin_first",
        magic_code_included: !!magicCode,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `PDF enviado para ${targetEmail}`,
        emailId: emailResponse.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-assistance-pdf-to-admin:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
