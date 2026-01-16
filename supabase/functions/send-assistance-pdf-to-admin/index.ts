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
  customMessage?: string;
  mode?: 'archive' | 'forward';
}

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    normal: "Normal",
    urgent: "Urgente",
    critical: "Critica",
  };
  return labels[priority] || priority;
};

const getPriorityColor = (priority: string): { r: number; g: number; b: number } => {
  switch (priority) {
    case "critical": return { r: 0.86, g: 0.15, b: 0.15 };
    case "urgent": return { r: 0.96, g: 0.62, b: 0.04 };
    default: return { r: 0.03, g: 0.57, b: 0.70 }; // Teal #0891b2
  }
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: "Pendente",
    awaiting_quotation: "Aguarda Orcamento",
    quotation_rejected: "Orcamento Rejeitado",
    in_progress: "Em Progresso",
    completed: "Concluida",
    cancelled: "Cancelada",
    accepted: "Aceite",
    scheduled: "Agendada",
  };
  return labels[status] || status;
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

const formatDateOnly = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Helper to split text into lines
function splitTextIntoLines(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const cleanText = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleanText.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
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
  
  return lines.slice(0, 6);
}

// Fetch and embed logo
async function fetchLogoBytes(): Promise<Uint8Array | null> {
  try {
    const logoUrl = "https://condo-assist.lovable.app/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png";
    console.log("Fetching logo from:", logoUrl);
    
    const response = await fetch(logoUrl);
    if (!response.ok) {
      console.error("Failed to fetch logo:", response.status);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error("Error fetching logo:", error);
    return null;
  }
}

const generateRealPDF = async (assistance: AssistanceData, magicCode?: string): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Premium color palette
  const primaryColor = rgb(0.03, 0.57, 0.70); // Teal #0891b2
  const darkBlue = rgb(0.07, 0.21, 0.33); // Dark blue #123554
  const textColor = rgb(0.15, 0.15, 0.15);
  const grayColor = rgb(0.45, 0.45, 0.45);
  const lightGray = rgb(0.96, 0.97, 0.98);
  const borderGray = rgb(0.88, 0.90, 0.92);
  const priorityRgb = getPriorityColor(assistance.priority);
  
  const leftMargin = 50;
  const rightMargin = 50;
  const contentWidth = width - leftMargin - rightMargin;
  let y = height - 40;
  
  // ==================== HEADER WITH LOGO ====================
  // Try to embed logo
  const logoBytes = await fetchLogoBytes();
  if (logoBytes) {
    try {
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.35); // Adjust scale for appropriate size
      
      // Center the logo
      const logoX = (width - logoDims.width) / 2;
      page.drawImage(logoImage, {
        x: logoX,
        y: y - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
      y -= logoDims.height + 15;
    } catch (logoError) {
      console.error("Error embedding logo:", logoError);
      // Fallback to text header
      page.drawText("LUVIMG", {
        x: (width - helveticaBold.widthOfTextAtSize("LUVIMG", 32)) / 2,
        y,
        size: 32,
        font: helveticaBold,
        color: primaryColor,
      });
      y -= 45;
    }
  } else {
    // Fallback text header
    page.drawText("LUVIMG", {
      x: (width - helveticaBold.widthOfTextAtSize("LUVIMG", 32)) / 2,
      y,
      size: 32,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 45;
  }
  
  // Subtitle
  const subtitle = "Administracao de Condominios";
  page.drawText(subtitle, {
    x: (width - helvetica.widthOfTextAtSize(subtitle, 12)) / 2,
    y,
    size: 12,
    font: helvetica,
    color: grayColor,
  });
  y -= 25;
  
  // Elegant divider line with gradient effect (two lines)
  page.drawLine({
    start: { x: leftMargin + 100, y },
    end: { x: width - rightMargin - 100, y },
    thickness: 2,
    color: primaryColor,
  });
  y -= 8;
  page.drawLine({
    start: { x: leftMargin + 150, y },
    end: { x: width - rightMargin - 150, y },
    thickness: 1,
    color: borderGray,
  });
  y -= 25;
  
  // Report title
  const reportTitle = "RELATORIO DE ASSISTENCIA";
  page.drawText(reportTitle, {
    x: (width - helveticaBold.widthOfTextAtSize(reportTitle, 16)) / 2,
    y,
    size: 16,
    font: helveticaBold,
    color: darkBlue,
  });
  y -= 18;
  
  // Generation date
  const genDate = `Gerado em ${formatDate(new Date().toISOString())}`;
  page.drawText(genDate, {
    x: (width - helvetica.widthOfTextAtSize(genDate, 10)) / 2,
    y,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  y -= 30;
  
  // ==================== MAIN CONTENT BOX ====================
  // Assistance Number with Priority Badge
  const assistanceBoxHeight = 65;
  page.drawRectangle({
    x: leftMargin,
    y: y - assistanceBoxHeight,
    width: contentWidth,
    height: assistanceBoxHeight,
    color: rgb(0.97, 0.99, 1),
    borderColor: primaryColor,
    borderWidth: 1.5,
  });
  
  // Assistance number
  const assistNum = `ASSISTENCIA N. ${assistance.assistance_number || "N/A"}`;
  page.drawText(assistNum, {
    x: leftMargin + 15,
    y: y - 25,
    size: 20,
    font: helveticaBold,
    color: darkBlue,
  });
  
  // Priority badge on the right
  const priorityLabel = getPriorityLabel(assistance.priority);
  const badgeWidth = priorityLabel.length * 7 + 24;
  const badgeX = width - rightMargin - badgeWidth - 15;
  page.drawRectangle({
    x: badgeX,
    y: y - 30,
    width: badgeWidth,
    height: 20,
    color: rgb(priorityRgb.r, priorityRgb.g, priorityRgb.b),
  });
  page.drawText(priorityLabel.toUpperCase(), {
    x: badgeX + 12,
    y: y - 24,
    size: 10,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  
  // Title
  const titleLines = splitTextIntoLines(assistance.title, helveticaBold, 12, contentWidth - 30);
  let titleY = y - 50;
  for (const line of titleLines.slice(0, 2)) {
    page.drawText(line, {
      x: leftMargin + 15,
      y: titleY,
      size: 12,
      font: helveticaBold,
      color: textColor,
    });
    titleY -= 14;
  }
  
  y -= assistanceBoxHeight + 15;
  
  // ==================== DESCRIPTION (if exists) ====================
  if (assistance.description) {
    page.drawText("DESCRICAO", {
      x: leftMargin,
      y,
      size: 10,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 15;
    
    const descLines = splitTextIntoLines(assistance.description, helvetica, 10, contentWidth);
    for (const line of descLines) {
      page.drawText(line, {
        x: leftMargin,
        y,
        size: 10,
        font: helvetica,
        color: grayColor,
      });
      y -= 13;
    }
    y -= 10;
  }
  
  // ==================== INFO SECTIONS ====================
  // Building Section
  const sectionHeight = 75;
  page.drawRectangle({
    x: leftMargin,
    y: y - sectionHeight,
    width: contentWidth,
    height: sectionHeight,
    color: lightGray,
    borderColor: borderGray,
    borderWidth: 1,
  });
  
  // Section header with icon-like decoration
  page.drawRectangle({
    x: leftMargin,
    y: y - 20,
    width: 4,
    height: 20,
    color: primaryColor,
  });
  page.drawText("EDIFICIO", {
    x: leftMargin + 12,
    y: y - 14,
    size: 11,
    font: helveticaBold,
    color: darkBlue,
  });
  
  let infoY = y - 35;
  page.drawText(`Codigo: ${assistance.buildings?.code || "N/A"}`, {
    x: leftMargin + 12,
    y: infoY,
    size: 10,
    font: helvetica,
    color: textColor,
  });
  
  // Second column for NIF
  if (assistance.buildings?.nif) {
    page.drawText(`NIF: ${assistance.buildings.nif}`, {
      x: leftMargin + 200,
      y: infoY,
      size: 10,
      font: helvetica,
      color: textColor,
    });
  }
  
  infoY -= 14;
  const buildingName = assistance.buildings?.name || "N/A";
  const nameLines = splitTextIntoLines(`Nome: ${buildingName}`, helvetica, 10, contentWidth - 24);
  for (const line of nameLines.slice(0, 1)) {
    page.drawText(line, {
      x: leftMargin + 12,
      y: infoY,
      size: 10,
      font: helvetica,
      color: textColor,
    });
    infoY -= 14;
  }
  
  if (assistance.buildings?.address) {
    const addrLines = splitTextIntoLines(`Morada: ${assistance.buildings.address}`, helvetica, 10, contentWidth - 24);
    for (const line of addrLines.slice(0, 1)) {
      page.drawText(line, {
        x: leftMargin + 12,
        y: infoY,
        size: 10,
        font: helvetica,
        color: textColor,
      });
    }
  }
  
  y -= sectionHeight + 12;
  
  // Intervention Type Section
  const interventionHeight = 45;
  page.drawRectangle({
    x: leftMargin,
    y: y - interventionHeight,
    width: contentWidth,
    height: interventionHeight,
    color: lightGray,
    borderColor: borderGray,
    borderWidth: 1,
  });
  
  page.drawRectangle({
    x: leftMargin,
    y: y - 20,
    width: 4,
    height: 20,
    color: rgb(0.55, 0.36, 0.75), // Purple accent
  });
  page.drawText("TIPO DE INTERVENCAO", {
    x: leftMargin + 12,
    y: y - 14,
    size: 11,
    font: helveticaBold,
    color: darkBlue,
  });
  
  const interventionText = assistance.intervention_types?.name || "N/A";
  const categoryText = assistance.intervention_types?.category ? ` (${assistance.intervention_types.category})` : "";
  page.drawText(`${interventionText}${categoryText}`, {
    x: leftMargin + 12,
    y: y - 35,
    size: 10,
    font: helvetica,
    color: textColor,
  });
  
  y -= interventionHeight + 12;
  
  // Supplier Section (if assigned)
  if (assistance.suppliers) {
    const supplierHeight = 70;
    page.drawRectangle({
      x: leftMargin,
      y: y - supplierHeight,
      width: contentWidth,
      height: supplierHeight,
      color: rgb(0.94, 0.99, 0.97),
      borderColor: rgb(0.16, 0.73, 0.56),
      borderWidth: 1,
    });
    
    page.drawRectangle({
      x: leftMargin,
      y: y - 20,
      width: 4,
      height: 20,
      color: rgb(0.16, 0.73, 0.56), // Green
    });
    page.drawText("FORNECEDOR ATRIBUIDO", {
      x: leftMargin + 12,
      y: y - 14,
      size: 11,
      font: helveticaBold,
      color: rgb(0.05, 0.45, 0.35),
    });
    
    let suppY = y - 35;
    page.drawText(`Nome: ${assistance.suppliers.name}`, {
      x: leftMargin + 12,
      y: suppY,
      size: 10,
      font: helveticaBold,
      color: textColor,
    });
    
    suppY -= 14;
    if (assistance.suppliers.email) {
      page.drawText(`Email: ${assistance.suppliers.email}`, {
        x: leftMargin + 12,
        y: suppY,
        size: 10,
        font: helvetica,
        color: textColor,
      });
    }
    
    if (assistance.suppliers.phone) {
      page.drawText(`Tel: ${assistance.suppliers.phone}`, {
        x: leftMargin + 250,
        y: suppY,
        size: 10,
        font: helvetica,
        color: textColor,
      });
    }
    
    if (assistance.suppliers.specialization) {
      suppY -= 14;
      page.drawText(`Especializacao: ${assistance.suppliers.specialization}`, {
        x: leftMargin + 12,
        y: suppY,
        size: 10,
        font: helvetica,
        color: grayColor,
      });
    }
    
    y -= supplierHeight + 12;
  }
  
  // Status and Dates Section
  const statusHeight = 55;
  page.drawRectangle({
    x: leftMargin,
    y: y - statusHeight,
    width: contentWidth,
    height: statusHeight,
    color: lightGray,
    borderColor: borderGray,
    borderWidth: 1,
  });
  
  page.drawRectangle({
    x: leftMargin,
    y: y - 20,
    width: 4,
    height: 20,
    color: rgb(0.98, 0.55, 0.24), // Orange
  });
  page.drawText("ESTADO E DATAS", {
    x: leftMargin + 12,
    y: y - 14,
    size: 11,
    font: helveticaBold,
    color: darkBlue,
  });
  
  let statusY = y - 35;
  page.drawText(`Estado: ${getStatusLabel(assistance.status)}`, {
    x: leftMargin + 12,
    y: statusY,
    size: 10,
    font: helvetica,
    color: textColor,
  });
  
  page.drawText(`Criado: ${formatDateOnly(assistance.created_at)}`, {
    x: leftMargin + 200,
    y: statusY,
    size: 10,
    font: helvetica,
    color: textColor,
  });
  
  statusY -= 14;
  const reqQuot = assistance.requires_quotation ? "Sim" : "Nao";
  page.drawText(`Requer orcamento: ${reqQuot}`, {
    x: leftMargin + 12,
    y: statusY,
    size: 10,
    font: helvetica,
    color: textColor,
  });
  
  if (assistance.quotation_deadline) {
    page.drawText(`Prazo orcamento: ${formatDateOnly(assistance.quotation_deadline)}`, {
      x: leftMargin + 200,
      y: statusY,
      size: 10,
      font: helvetica,
      color: textColor,
    });
  }
  
  y -= statusHeight + 12;
  
  // ==================== MAGIC CODE SECTION (if provided) ====================
  if (magicCode) {
    const codeHeight = 70;
    page.drawRectangle({
      x: leftMargin,
      y: y - codeHeight,
      width: contentWidth,
      height: codeHeight,
      color: rgb(1, 0.98, 0.92),
      borderColor: rgb(0.96, 0.72, 0.20),
      borderWidth: 2,
    });
    
    page.drawRectangle({
      x: leftMargin,
      y: y - 20,
      width: 4,
      height: 20,
      color: rgb(0.96, 0.72, 0.20),
    });
    page.drawText("CODIGO DE ACESSO AO PORTAL DO FORNECEDOR", {
      x: leftMargin + 12,
      y: y - 14,
      size: 11,
      font: helveticaBold,
      color: rgb(0.65, 0.38, 0.05),
    });
    
    // Large magic code
    page.drawText(magicCode, {
      x: leftMargin + 12,
      y: y - 42,
      size: 22,
      font: helveticaBold,
      color: textColor,
    });
    
    // Portal URL
    page.drawText("Portal: condo-assist.lovable.app/fornecedor", {
      x: leftMargin + 12,
      y: y - 60,
      size: 9,
      font: helvetica,
      color: grayColor,
    });
    
    y -= codeHeight + 12;
  }
  
  // ==================== FOOTER ====================
  const footerY = 80;
  
  // Footer divider
  page.drawLine({
    start: { x: leftMargin, y: footerY },
    end: { x: width - rightMargin, y: footerY },
    thickness: 1,
    color: primaryColor,
  });
  
  // Company info - centered
  const companyName = "Luvimg - Administracao de Condominios, Lda";
  page.drawText(companyName, {
    x: (width - helveticaBold.widthOfTextAtSize(companyName, 9)) / 2,
    y: footerY - 15,
    size: 9,
    font: helveticaBold,
    color: darkBlue,
  });
  
  const address = "Praceta Pedro Manuel Pereira n. 1 - 1. esq, 2620-158 Povoa Santo Adriao";
  page.drawText(address, {
    x: (width - helvetica.widthOfTextAtSize(address, 8)) / 2,
    y: footerY - 27,
    size: 8,
    font: helvetica,
    color: grayColor,
  });
  
  const contacts = "Tel: +351 219 379 248 | Email: geral@luvimg.com";
  page.drawText(contacts, {
    x: (width - helvetica.widthOfTextAtSize(contacts, 8)) / 2,
    y: footerY - 39,
    size: 8,
    font: helvetica,
    color: grayColor,
  });
  
  const autoGen = "Documento gerado automaticamente pelo Sistema de Gestao de Assistencias";
  page.drawText(autoGen, {
    x: (width - helvetica.widthOfTextAtSize(autoGen, 7)) / 2,
    y: footerY - 55,
    size: 7,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });
  
  return await pdfDoc.save();
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-assistance-pdf-to-admin function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assistanceId, adminEmail, magicCode, customMessage, mode = 'archive' }: RequestBody = await req.json();

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
    // NOTE: Resend in test mode only allows sending to the account owner's email
    // Once domain is verified at resend.com/domains, change this to use the actual admin email
    let targetEmail = adminEmail || "bilal.machraa@gmail.com"; // Temporary: using Resend account email
    
    if (!adminEmail) {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "admin_email")
        .single();
      
      // For now, we override with the Resend account email since domain is not verified
      // Once luvimg.com is verified at resend.com/domains, uncomment the line below:
      // if (setting?.value) {
      //   targetEmail = typeof setting.value === "string" 
      //     ? setting.value.replace(/"/g, "") 
      //     : setting.value;
      // }
      
      console.log("Admin email setting found:", setting?.value, "but using Resend account email due to unverified domain");
    }

    console.log(`Generating premium PDF for assistance #${assistance.assistance_number}`);

    // Generate the premium PDF
    const pdfBytes = await generateRealPDF(assistance as unknown as AssistanceData, isArchiveMode ? undefined : magicCode);
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

    console.log(`PDF generated, size: ${pdfBytes.length} bytes`);

    // Prepare email content
    const subject = isArchiveMode 
      ? `[ARQUIVO] Assistencia #${assistance.assistance_number} - ${assistance.title}`
      : `Pedido de Assistencia #${assistance.assistance_number} - ${assistance.title}`;

    const htmlContent = isArchiveMode ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://condo-assist.lovable.app/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png" alt="Luvimg" style="max-width: 200px; height: auto;">
        </div>
        <div style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Novo Pedido de Assistência</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Assistência #${assistance.assistance_number}</p>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; padding: 20px;">
          <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">${assistance.title}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Edifício:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${assistance.buildings?.name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Tipo:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${assistance.intervention_types?.name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Fornecedor:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${assistance.suppliers?.name || 'Não atribuído'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Prioridade:</td>
              <td style="padding: 10px 0;">
                <span style="background: ${assistance.priority === 'critical' ? '#dc2626' : assistance.priority === 'urgent' ? '#f59e0b' : '#0891b2'}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px;">${getPriorityLabel(assistance.priority).toUpperCase()}</span>
              </td>
            </tr>
          </table>
          <p style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; color: #64748b; font-size: 14px;">
            📎 PDF detalhado em anexo para arquivo ou reencaminhamento ao fornecedor.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Luvimg - Administração de Condomínios, Lda</p>
          <p style="color: #94a3b8; font-size: 11px; margin: 5px 0 0 0;">Documento gerado automaticamente</p>
        </div>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://condo-assist.lovable.app/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png" alt="Luvimg" style="max-width: 200px; height: auto;">
        </div>
        <div style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Pedido de Assistência</h1>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; padding: 20px;">
          <p>Prezado(a) ${assistance.suppliers?.name || 'Fornecedor'},</p>
          <p>${customMessage || 'Segue em anexo o pedido de assistência para a sua análise.'}</p>
          ${magicCode ? `
            <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #92400e; font-weight: bold;">Código de Acesso ao Portal:</p>
              <p style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #0f172a;">${magicCode}</p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
                <a href="https://condo-assist.lovable.app/fornecedor" style="color: #0891b2;">condo-assist.lovable.app/fornecedor</a>
              </p>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    console.log(`Sending email to: ${targetEmail}`);

    // Send email with PDF attachment
    const emailResult = await resend.emails.send({
      from: "Luvimg <onboarding@resend.dev>",
      to: [targetEmail],
      subject: subject,
      html: htmlContent,
      attachments: [
        {
          filename: `assistencia-${assistance.assistance_number || assistance.id.slice(-8)}.pdf`,
          content: pdfBase64,
          content_type: "application/pdf",
        },
      ],
    });

    console.log("Email sent result:", emailResult);

    // Check for Resend errors
    if (emailResult.error) {
      console.error("Resend error:", emailResult.error);
      
      // Log the failed attempt
      await supabase.from("email_logs").insert({
        assistance_id: assistanceId,
        supplier_id: assistance.suppliers?.id,
        recipient_email: targetEmail,
        subject: subject,
        status: "failed",
        template_used: "assistance_pdf_premium",
        metadata: {
          mode: mode,
          resend_error: emailResult.error,
        },
      });
      
      throw new Error(`Email sending failed: ${JSON.stringify(emailResult.error)}`);
    }

    // Log successful email
    await supabase.from("email_logs").insert({
      assistance_id: assistanceId,
      supplier_id: assistance.suppliers?.id,
      recipient_email: targetEmail,
      subject: subject,
      status: "sent",
      template_used: "assistance_pdf_premium",
      metadata: {
        mode: mode,
        email_id: emailResult.data?.id,
        pdf_size: pdfBytes.length,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `PDF premium enviado para ${targetEmail}`,
        emailId: emailResult.data?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-assistance-pdf-to-admin:", error);
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
