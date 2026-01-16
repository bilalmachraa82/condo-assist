import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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
  mode?: 'archive' | 'forward'; // 'archive' = simple PDF, 'forward' = with magic code for supplier
}

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    normal: "Normal",
    urgent: "Urgente",
    critical: "Crítica",
  };
  return labels[priority] || priority;
};

const getPriorityColor = (priority: string): { r: number; g: number; b: number } => {
  switch (priority) {
    case "critical": return { r: 0.86, g: 0.15, b: 0.15 }; // #dc2626
    case "urgent": return { r: 0.96, g: 0.62, b: 0.04 }; // #f59e0b
    default: return { r: 0.23, g: 0.51, b: 0.91 }; // #3b82f6
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

const generateRealPDF = async (assistance: AssistanceData, magicCode?: string): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const primaryColor = rgb(0.12, 0.25, 0.69); // #1e40af
  const textColor = rgb(0.2, 0.2, 0.2);
  const grayColor = rgb(0.4, 0.4, 0.4);
  const priorityRgb = getPriorityColor(assistance.priority);
  
  let y = height - 50;
  const leftMargin = 50;
  const contentWidth = 495;
  
  // Header - LUVIMG
  page.drawText("LUVIMG - Gestão de Condomínios", {
    x: leftMargin,
    y,
    size: 20,
    font: helveticaBold,
    color: primaryColor,
  });
  
  y -= 20;
  page.drawText("Pedido de Assistência", {
    x: leftMargin,
    y,
    size: 12,
    font: helvetica,
    color: grayColor,
  });
  
  y -= 15;
  page.drawText(`Gerado em: ${formatDate(new Date().toISOString())}`, {
    x: leftMargin,
    y,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  
  // Blue line separator
  y -= 15;
  page.drawLine({
    start: { x: leftMargin, y },
    end: { x: leftMargin + contentWidth, y },
    thickness: 3,
    color: primaryColor,
  });
  
  // Assistance Number and Priority
  y -= 40;
  page.drawText(`ASSISTÊNCIA Nº ${assistance.assistance_number || "N/A"}`, {
    x: leftMargin,
    y,
    size: 24,
    font: helveticaBold,
    color: primaryColor,
  });
  
  // Priority badge
  y -= 30;
  const priorityLabel = getPriorityLabel(assistance.priority);
  const badgeWidth = priorityLabel.length * 8 + 20;
  page.drawRectangle({
    x: leftMargin,
    y: y - 5,
    width: badgeWidth,
    height: 22,
    color: rgb(priorityRgb.r, priorityRgb.g, priorityRgb.b),
    borderRadius: 10,
  });
  page.drawText(priorityLabel.toUpperCase(), {
    x: leftMargin + 10,
    y: y + 2,
    size: 11,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  
  // Title and Description
  y -= 40;
  page.drawText(assistance.title, {
    x: leftMargin,
    y,
    size: 16,
    font: helveticaBold,
    color: textColor,
  });
  
  if (assistance.description) {
    y -= 20;
    const descLines = splitTextIntoLines(assistance.description, helvetica, 11, contentWidth);
    for (const line of descLines) {
      page.drawText(line, {
        x: leftMargin,
        y,
        size: 11,
        font: helvetica,
        color: grayColor,
      });
      y -= 15;
    }
  }
  
  // Section: Building Info
  y -= 20;
  page.drawRectangle({
    x: leftMargin,
    y: y - 70,
    width: contentWidth,
    height: 80,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.89, 0.91, 0.94),
    borderWidth: 1,
  });
  
  y -= 5;
  page.drawText("EDIFICIO", {
    x: leftMargin + 10,
    y,
    size: 12,
    font: helveticaBold,
    color: primaryColor,
  });
  
  y -= 20;
  page.drawText(`Código: ${assistance.buildings?.code || "N/A"}`, {
    x: leftMargin + 10,
    y,
    size: 11,
    font: helvetica,
    color: textColor,
  });
  
  y -= 15;
  page.drawText(`Nome: ${assistance.buildings?.name || "N/A"}`, {
    x: leftMargin + 10,
    y,
    size: 11,
    font: helvetica,
    color: textColor,
  });
  
  if (assistance.buildings?.nif) {
    y -= 15;
    page.drawText(`NIF: ${assistance.buildings.nif}`, {
      x: leftMargin + 10,
      y,
      size: 11,
      font: helvetica,
      color: textColor,
    });
  }
  
  if (assistance.buildings?.address) {
    y -= 15;
    page.drawText(`Morada: ${assistance.buildings.address}`, {
      x: leftMargin + 10,
      y,
      size: 11,
      font: helvetica,
      color: textColor,
    });
  }
  
  // Section: Intervention Type
  y -= 30;
  page.drawRectangle({
    x: leftMargin,
    y: y - 35,
    width: contentWidth,
    height: 45,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.89, 0.91, 0.94),
    borderWidth: 1,
  });
  
  y -= 5;
  page.drawText("TIPO DE INTERVENCAO", {
    x: leftMargin + 10,
    y,
    size: 12,
    font: helveticaBold,
    color: primaryColor,
  });
  
  y -= 20;
  const interventionText = assistance.intervention_types?.name || "N/A";
  const categoryText = assistance.intervention_types?.category ? ` (${assistance.intervention_types.category})` : "";
  page.drawText(`${interventionText}${categoryText}`, {
    x: leftMargin + 10,
    y,
    size: 11,
    font: helvetica,
    color: textColor,
  });
  
  // Section: Supplier
  if (assistance.suppliers) {
    y -= 30;
    page.drawRectangle({
      x: leftMargin,
      y: y - 70,
      width: contentWidth,
      height: 80,
      color: rgb(0.93, 0.99, 0.96),
      borderColor: rgb(0.65, 0.95, 0.82),
      borderWidth: 1,
    });
    
    y -= 5;
    page.drawText("FORNECEDOR ATRIBUIDO", {
      x: leftMargin + 10,
      y,
      size: 12,
      font: helveticaBold,
      color: rgb(0.02, 0.59, 0.41), // #059669
    });
    
    y -= 20;
    page.drawText(`Nome: ${assistance.suppliers.name}`, {
      x: leftMargin + 10,
      y,
      size: 11,
      font: helvetica,
      color: textColor,
    });
    
    if (assistance.suppliers.email) {
      y -= 15;
      page.drawText(`Email: ${assistance.suppliers.email}`, {
        x: leftMargin + 10,
        y,
        size: 11,
        font: helvetica,
        color: textColor,
      });
    }
    
    if (assistance.suppliers.phone) {
      y -= 15;
      page.drawText(`Telefone: ${assistance.suppliers.phone}`, {
        x: leftMargin + 10,
        y,
        size: 11,
        font: helvetica,
        color: textColor,
      });
    }
  }
  
  // Section: Magic Code (if provided)
  if (magicCode) {
    y -= 40;
    page.drawRectangle({
      x: leftMargin,
      y: y - 55,
      width: contentWidth,
      height: 65,
      color: rgb(1, 0.97, 0.86),
      borderColor: rgb(0.99, 0.83, 0.30),
      borderWidth: 2,
    });
    
    y -= 5;
    page.drawText("CODIGO DE ACESSO AO PORTAL", {
      x: leftMargin + 10,
      y,
      size: 12,
      font: helveticaBold,
      color: rgb(0.71, 0.26, 0.05), // #b45309
    });
    
    y -= 25;
    page.drawText(magicCode, {
      x: leftMargin + 10,
      y,
      size: 18,
      font: helveticaBold,
      color: textColor,
    });
    
    y -= 18;
    page.drawText("Portal: condo-assist.lovable.app/fornecedor", {
      x: leftMargin + 10,
      y,
      size: 10,
      font: helvetica,
      color: grayColor,
    });
  }
  
  // Footer
  page.drawLine({
    start: { x: leftMargin, y: 60 },
    end: { x: leftMargin + contentWidth, y: 60 },
    thickness: 1,
    color: rgb(0.89, 0.91, 0.94),
  });
  
  page.drawText("LUVIMG - Gestão de Condomínios | arquivo@luvimg.com", {
    x: leftMargin,
    y: 45,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  
  page.drawText("Documento gerado automaticamente pelo sistema de gestão de assistências", {
    x: leftMargin,
    y: 32,
    size: 9,
    font: helvetica,
    color: grayColor,
  });
  
  return await pdfDoc.save();
};

// Helper to split text into lines
function splitTextIntoLines(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  // Clean the text: remove newlines and extra whitespace
  const cleanText = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleanText.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    // Skip empty words
    if (!word) continue;
    
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.slice(0, 5); // Limit to 5 lines
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-assistance-pdf-to-admin function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assistanceId, adminEmail, magicCode, mode = 'archive' }: RequestBody = await req.json();

    if (!assistanceId) {
      throw new Error("assistanceId is required");
    }

    const isArchiveMode = mode === 'archive' || !magicCode;
    console.log(`Fetching assistance data for ID: ${assistanceId} (mode: ${isArchiveMode ? 'archive' : 'forward'})`);

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

    console.log(`Generating real PDF for assistance #${assistance.assistance_number}`);

    // Generate real PDF - only include magic code if in forward mode
    const pdfBytes = await generateRealPDF(assistance as AssistanceData, isArchiveMode ? undefined : magicCode);
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

    console.log(`Sending PDF to email: ${targetEmail} (mode: ${isArchiveMode ? 'archive' : 'forward'})`);

    // Build email body based on mode
    const priorityEmoji = assistance.priority === "critical" ? "🔴" : 
                         assistance.priority === "urgent" ? "🟡" : "🟢";
    
    let emailBody: string;
    let emailSubject: string;

    if (isArchiveMode) {
      // Simple archive mode - just the PDF with minimal email content
      emailSubject = `${priorityEmoji} [Assistência #${assistance.assistance_number}] ${assistance.title}`;
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">📋 Documento de Assistência</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Assistência #${assistance.assistance_number}:</strong> ${assistance.title}</p>
            <p><strong>Prioridade:</strong> ${getPriorityLabel(assistance.priority)}</p>
            <p><strong>Edifício:</strong> ${assistance.buildings?.code} - ${assistance.buildings?.name}</p>
            ${assistance.buildings?.address ? `<p><strong>Morada:</strong> ${assistance.buildings.address}</p>` : ""}
            ${assistance.suppliers ? `<p><strong>Fornecedor:</strong> ${assistance.suppliers.name}</p>` : ""}
          </div>
          
          <p style="color: #374151;">
            Em anexo encontra o documento PDF com todos os detalhes da assistência.
          </p>
          
          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
            Este email foi gerado automaticamente pelo sistema LUVIMG.
          </p>
        </div>
      `;
    } else {
      // Forward mode - with magic code and instructions for forwarding to supplier
      emailSubject = `${priorityEmoji} [Assistência #${assistance.assistance_number}] ${assistance.title} - Para Reencaminhar`;
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">${priorityEmoji} Nova Assistência para Reencaminhar</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Assistência #${assistance.assistance_number}:</strong> ${assistance.title}</p>
            <p><strong>Prioridade:</strong> ${getPriorityLabel(assistance.priority)}</p>
            <p><strong>Edifício:</strong> ${assistance.buildings?.code} - ${assistance.buildings?.name}</p>
            <p><strong>Fornecedor:</strong> ${assistance.suppliers?.name || "Não atribuído"}</p>
            ${assistance.suppliers?.email ? `<p><strong>Email do Fornecedor:</strong> ${assistance.suppliers.email}</p>` : ""}
          </div>

          ${magicCode ? `
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
          ` : ""}
      
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">📋 Próximos Passos</h3>
            <ol style="color: #1e3a8a; line-height: 1.8;">
              <li>Reveja o PDF anexado com todos os detalhes</li>
              <li>Reencaminhe este email para: <strong>${assistance.suppliers?.email || "fornecedor"}</strong></li>
              ${magicCode ? "<li>Certifique-se de incluir o código de acesso</li>" : ""}
            </ol>
          </div>
          
          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
            Este email foi gerado automaticamente pelo sistema LUVIMG.
          </p>
        </div>
      `;
    }

    // Send email with real PDF attachment
    const emailResponse = await resend.emails.send({
      from: "LUVIMG Assistências <onboarding@resend.dev>",
      to: [targetEmail],
      subject: emailSubject,
      html: emailBody,
      attachments: [
        {
          filename: `assistencia-${assistance.assistance_number}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf',
        },
      ],
    });

    console.log("Email sent successfully with real PDF:", emailResponse);

    // Log the email
    await supabase.from("email_logs").insert({
      recipient_email: targetEmail,
      subject: emailSubject,
      template_used: isArchiveMode ? "admin_pdf_archive" : "admin_pdf_forward",
      status: "sent",
      assistance_id: assistanceId,
      supplier_id: assistance.suppliers?.id || null,
      metadata: {
        email_mode: isArchiveMode ? "archive" : "forward",
        magic_code_included: !isArchiveMode && !!magicCode,
        pdf_format: "real_pdf",
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `PDF real enviado para ${targetEmail}`,
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