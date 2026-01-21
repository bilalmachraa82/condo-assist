import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, RGB } from "https://esm.sh/pdf-lib@1.17.1";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

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

interface PhotoData {
  id: string;
  file_url: string;
  caption?: string | null;
  photo_type: string;
  created_at: string;
}

interface RequestBody {
  assistanceId: string;
  adminEmail?: string;
  magicCode?: string;
  customMessage?: string;
  mode?: 'archive' | 'forward';
  includePhotos?: boolean;
}

interface PDFContext {
  pdfDoc: any;
  page: PDFPage;
  helvetica: PDFFont;
  helveticaBold: PDFFont;
  y: number;
  pageNumber: number;
  width: number;
  height: number;
  leftMargin: number;
  rightMargin: number;
  contentWidth: number;
  colors: {
    primary: RGB;
    darkBlue: RGB;
    text: RGB;
    gray: RGB;
    lightGray: RGB;
    borderGray: RGB;
  };
}

// Layout constants
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const HEADER_HEIGHT = 90;
const FOOTER_HEIGHT = 60;
const LEFT_MARGIN = 50;
const RIGHT_MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;
const CONTENT_TOP = PAGE_HEIGHT - HEADER_HEIGHT;
const CONTENT_BOTTOM = FOOTER_HEIGHT + 20;
const SECTION_GAP = 12;

// Photo grid constants
const PHOTOS_PER_ROW = 2;
const PHOTO_WIDTH = (CONTENT_WIDTH - 15) / PHOTOS_PER_ROW; // 15px gap between photos
const PHOTO_HEIGHT = 130;
const PHOTO_GAP = 15;
const CAPTION_HEIGHT = 18;

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
    default: return { r: 0.03, g: 0.57, b: 0.70 };
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

const getPhotoTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    before: "Antes",
    during: "Durante",
    after: "Depois",
    initial: "Inicial",
    progress: "Progresso",
    completion: "Conclusao",
    other: "Outro",
  };
  return labels[type] || type;
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

const extractPostalCode = (address?: string | null): string | null => {
  if (!address) return null;
  
  const patterns = [
    /\b\d{4}[-\s]\d{3}\b/,
    /\b\d{4}\d{3}\b/,
    /(\d{4})[-\s]?(\d{3})/
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      const fullMatch = match[0];
      if (fullMatch.includes('-') || fullMatch.includes(' ')) {
        return fullMatch;
      } else if (fullMatch.length === 7) {
        return fullMatch.substring(0, 4) + '-' + fullMatch.substring(4);
      } else if (match[1] && match[2]) {
        return match[1] + '-' + match[2];
      }
      return fullMatch;
    }
  }
  
  return null;
};

function splitTextIntoLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
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
  
  return lines;
}

async function fetchLogoBytes(): Promise<Uint8Array | null> {
  try {
    const logoUrl = "https://condo-assist.lovable.app/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png";
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    return null;
  }
}

// Fetch image from URL and return as Uint8Array
async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' } | null> {
  try {
    console.log("Fetching image:", url);
    const response = await fetch(url, { 
      headers: { 'Accept': 'image/*' },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      console.error("Failed to fetch image:", response.status, url);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Determine image type from content-type or URL
    let type: 'png' | 'jpg' = 'jpg';
    if (contentType.includes('png') || url.toLowerCase().includes('.png')) {
      type = 'png';
    }
    
    console.log("Image fetched successfully:", bytes.length, "bytes, type:", type);
    return { bytes, type };
  } catch (error) {
    console.error("Error fetching image:", error, url);
    return null;
  }
}

// Add new page with header and footer
async function addNewPage(ctx: PDFContext, logoImage: any, logoBytes: Uint8Array | null): Promise<void> {
  ctx.pageNumber++;
  ctx.page = ctx.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = CONTENT_TOP;
  
  // Draw minimal header for continuation pages
  if (ctx.pageNumber > 1) {
    const headerText = "LUVIMG - Relatorio de Assistencia (continuacao)";
    ctx.page.drawText(headerText, {
      x: LEFT_MARGIN,
      y: PAGE_HEIGHT - 30,
      size: 9,
      font: ctx.helvetica,
      color: ctx.colors.gray,
    });
    
    const pageNumText = `Pagina ${ctx.pageNumber}`;
    ctx.page.drawText(pageNumText, {
      x: PAGE_WIDTH - RIGHT_MARGIN - ctx.helvetica.widthOfTextAtSize(pageNumText, 9),
      y: PAGE_HEIGHT - 30,
      size: 9,
      font: ctx.helvetica,
      color: ctx.colors.gray,
    });
    
    ctx.page.drawLine({
      start: { x: LEFT_MARGIN, y: PAGE_HEIGHT - 40 },
      end: { x: PAGE_WIDTH - RIGHT_MARGIN, y: PAGE_HEIGHT - 40 },
      thickness: 0.5,
      color: ctx.colors.borderGray,
    });
    
    ctx.y = PAGE_HEIGHT - 55;
  }
  
  drawFooter(ctx);
}

function drawFooter(ctx: PDFContext): void {
  const footerY = 30;
  
  // Linha separadora
  ctx.page.drawLine({
    start: { x: LEFT_MARGIN, y: footerY + 45 },
    end: { x: PAGE_WIDTH - RIGHT_MARGIN, y: footerY + 45 },
    thickness: 0.5,
    color: ctx.colors.borderGray,
  });
  
  // Texto central: "Luvimg Condomínios, Lda"
  const companyName = "Luvimg Condominios, Lda";
  ctx.page.drawText(companyName, {
    x: (PAGE_WIDTH - ctx.helveticaBold.widthOfTextAtSize(companyName, 12)) / 2,
    y: footerY + 28,
    size: 12,
    font: ctx.helveticaBold,
    color: ctx.colors.gray,
  });
  
  // Mensagem automática
  const autoMsg = "Este documento foi gerado automaticamente pelo sistema de gestao de assistencias.";
  ctx.page.drawText(autoMsg, {
    x: (PAGE_WIDTH - ctx.helvetica.widthOfTextAtSize(autoMsg, 8)) / 2,
    y: footerY + 12,
    size: 8,
    font: ctx.helvetica,
    color: ctx.colors.gray,
  });
  
  // Número de página
  if (ctx.pageNumber >= 1) {
    const pageText = `${ctx.pageNumber}`;
    ctx.page.drawText(pageText, {
      x: PAGE_WIDTH - RIGHT_MARGIN - ctx.helvetica.widthOfTextAtSize(pageText, 8),
      y: footerY + 5,
      size: 8,
      font: ctx.helvetica,
      color: ctx.colors.gray,
    });
  }
}

// Check if content fits, add new page if needed
async function ensureSpace(ctx: PDFContext, neededHeight: number, logoImage: any, logoBytes: Uint8Array | null): Promise<boolean> {
  if (ctx.y - neededHeight < CONTENT_BOTTOM) {
    await addNewPage(ctx, logoImage, logoBytes);
    return true;
  }
  return false;
}

// Draw photos in a grid layout
async function drawPhotosSection(
  ctx: PDFContext, 
  photos: PhotoData[], 
  pdfDoc: any,
  logoImage: any, 
  logoBytes: Uint8Array | null
): Promise<void> {
  if (photos.length === 0) return;
  
  // Section header
  const headerHeight = 25;
  await ensureSpace(ctx, headerHeight + PHOTO_HEIGHT + CAPTION_HEIGHT, logoImage, logoBytes);
  
  ctx.page.drawText("FOTOGRAFIAS", {
    x: LEFT_MARGIN,
    y: ctx.y,
    size: 11,
    font: ctx.helveticaBold,
    color: ctx.colors.primary,
  });
  
  ctx.page.drawText(`(${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'})`, {
    x: LEFT_MARGIN + ctx.helveticaBold.widthOfTextAtSize("FOTOGRAFIAS", 11) + 8,
    y: ctx.y,
    size: 9,
    font: ctx.helvetica,
    color: ctx.colors.gray,
  });
  
  ctx.y -= 20;
  
  // Draw photos in grid
  let photoIndex = 0;
  const embeddedImages: { image: any; photo: PhotoData }[] = [];
  
  // Pre-fetch and embed all images
  console.log(`Fetching ${photos.length} photos...`);
  for (const photo of photos) {
    try {
      const imageData = await fetchImageBytes(photo.file_url);
      if (imageData) {
        let embeddedImage;
        try {
          if (imageData.type === 'png') {
            embeddedImage = await pdfDoc.embedPng(imageData.bytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageData.bytes);
          }
          embeddedImages.push({ image: embeddedImage, photo });
        } catch (embedError) {
          console.error("Error embedding image:", embedError);
          // Try the other format as fallback
          try {
            if (imageData.type === 'png') {
              embeddedImage = await pdfDoc.embedJpg(imageData.bytes);
            } else {
              embeddedImage = await pdfDoc.embedPng(imageData.bytes);
            }
            embeddedImages.push({ image: embeddedImage, photo });
          } catch {
            console.error("Failed to embed image with fallback format");
          }
        }
      }
    } catch (error) {
      console.error("Error processing photo:", photo.id, error);
    }
  }
  
  console.log(`Successfully embedded ${embeddedImages.length} of ${photos.length} photos`);
  
  // Draw embedded images in grid
  while (photoIndex < embeddedImages.length) {
    const rowHeight = PHOTO_HEIGHT + CAPTION_HEIGHT + PHOTO_GAP;
    await ensureSpace(ctx, rowHeight, logoImage, logoBytes);
    
    // Draw up to PHOTOS_PER_ROW photos in this row
    for (let col = 0; col < PHOTOS_PER_ROW && photoIndex < embeddedImages.length; col++) {
      const { image, photo } = embeddedImages[photoIndex];
      const x = LEFT_MARGIN + col * (PHOTO_WIDTH + PHOTO_GAP);
      
      // Calculate image dimensions to fit within photo box while maintaining aspect ratio
      const originalWidth = image.width;
      const originalHeight = image.height;
      const aspectRatio = originalWidth / originalHeight;
      
      let drawWidth = PHOTO_WIDTH - 10; // Padding inside border
      let drawHeight = drawWidth / aspectRatio;
      
      if (drawHeight > PHOTO_HEIGHT - 10) {
        drawHeight = PHOTO_HEIGHT - 10;
        drawWidth = drawHeight * aspectRatio;
      }
      
      // Center image within the photo box
      const imgX = x + (PHOTO_WIDTH - drawWidth) / 2;
      const imgY = ctx.y - PHOTO_HEIGHT + (PHOTO_HEIGHT - drawHeight) / 2;
      
      // Draw photo border/background
      ctx.page.drawRectangle({
        x: x,
        y: ctx.y - PHOTO_HEIGHT,
        width: PHOTO_WIDTH,
        height: PHOTO_HEIGHT,
        color: ctx.colors.lightGray,
        borderColor: ctx.colors.borderGray,
        borderWidth: 1,
      });
      
      // Draw the image
      ctx.page.drawImage(image, {
        x: imgX,
        y: imgY,
        width: drawWidth,
        height: drawHeight,
      });
      
      // Draw caption below photo
      const captionY = ctx.y - PHOTO_HEIGHT - 12;
      const photoTypeLabel = getPhotoTypeLabel(photo.photo_type);
      const captionText = photo.caption 
        ? `${photoTypeLabel}: ${photo.caption}`.substring(0, 40) + (photo.caption.length > 35 ? '...' : '')
        : photoTypeLabel;
      
      // Type badge
      const badgeWidth = ctx.helveticaBold.widthOfTextAtSize(photoTypeLabel, 7) + 8;
      ctx.page.drawRectangle({
        x: x,
        y: captionY - 2,
        width: badgeWidth,
        height: 12,
        color: ctx.colors.primary,
      });
      ctx.page.drawText(photoTypeLabel, {
        x: x + 4,
        y: captionY + 1,
        size: 7,
        font: ctx.helveticaBold,
        color: rgb(1, 1, 1),
      });
      
      // Caption text
      if (photo.caption) {
        const maxCaptionWidth = PHOTO_WIDTH - badgeWidth - 8;
        const captionLines = splitTextIntoLines(photo.caption, ctx.helvetica, 7, maxCaptionWidth);
        ctx.page.drawText(captionLines[0] || "", {
          x: x + badgeWidth + 5,
          y: captionY + 1,
          size: 7,
          font: ctx.helvetica,
          color: ctx.colors.text,
        });
      }
      
      photoIndex++;
    }
    
    ctx.y -= PHOTO_HEIGHT + CAPTION_HEIGHT + PHOTO_GAP;
  }
  
  // If no photos were successfully embedded, show a message
  if (embeddedImages.length === 0 && photos.length > 0) {
    ctx.page.drawText("Nao foi possivel carregar as fotografias", {
      x: LEFT_MARGIN,
      y: ctx.y,
      size: 9,
      font: ctx.helvetica,
      color: ctx.colors.gray,
    });
    ctx.y -= 15;
  }
}

const generateRealPDF = async (
  assistance: AssistanceData, 
  magicCode?: string,
  photos?: PhotoData[]
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const colors = {
    primary: rgb(0.03, 0.57, 0.70), // Cyan/teal
    darkBlue: rgb(0.07, 0.21, 0.33),
    text: rgb(0.15, 0.15, 0.15),
    gray: rgb(0.40, 0.40, 0.40),
    lightGray: rgb(0.96, 0.97, 0.98),
    borderGray: rgb(0.78, 0.80, 0.82),
  };
  
  const logoBytes = await fetchLogoBytes();
  let logoImage: any = null;
  
  const firstPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  
  const ctx: PDFContext = {
    pdfDoc,
    page: firstPage,
    helvetica,
    helveticaBold,
    y: PAGE_HEIGHT - 40,
    pageNumber: 1,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    leftMargin: LEFT_MARGIN,
    rightMargin: RIGHT_MARGIN,
    contentWidth: CONTENT_WIDTH,
    colors,
  };
  
  // ==================== HEADER (matches AssistancePDFTemplate.tsx) ====================
  // Logo centrado - maior
  if (logoBytes) {
    try {
      logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.28); // Maior que antes (era 0.18)
      const logoX = (PAGE_WIDTH - logoDims.width) / 2;
      ctx.page.drawImage(logoImage, {
        x: logoX,
        y: ctx.y - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
      ctx.y -= logoDims.height + 12;
    } catch {
      ctx.page.drawText("LUVIMG", {
        x: (PAGE_WIDTH - helveticaBold.widthOfTextAtSize("LUVIMG", 28)) / 2,
        y: ctx.y,
        size: 28,
        font: helveticaBold,
        color: colors.primary,
      });
      ctx.y -= 40;
    }
  } else {
    ctx.page.drawText("LUVIMG", {
      x: (PAGE_WIDTH - helveticaBold.widthOfTextAtSize("LUVIMG", 28)) / 2,
      y: ctx.y,
      size: 28,
      font: helveticaBold,
      color: colors.primary,
    });
    ctx.y -= 40;
  }
  
  // Título centrado: "Relatório de Assistência #XXX"
  const reportTitle = `Relatorio de Assistencia #${assistance.assistance_number || "N/A"}`;
  ctx.page.drawText(reportTitle, {
    x: (PAGE_WIDTH - helveticaBold.widthOfTextAtSize(reportTitle, 16)) / 2,
    y: ctx.y,
    size: 16,
    font: helveticaBold,
    color: colors.text,
  });
  ctx.y -= 18;
  
  // Data de geração centrada
  const months = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const now = new Date();
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const genDate = `Gerado em ${day} de ${month} de ${year} as ${hours}:${minutes}`;
  ctx.page.drawText(genDate, {
    x: (PAGE_WIDTH - helvetica.widthOfTextAtSize(genDate, 9)) / 2,
    y: ctx.y,
    size: 9,
    font: helvetica,
    color: colors.gray,
  });
  ctx.y -= 20;
  
  // Linha separadora grossa
  ctx.page.drawLine({
    start: { x: LEFT_MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - RIGHT_MARGIN, y: ctx.y },
    thickness: 2,
    color: colors.borderGray,
  });
  ctx.y -= 25;
  
  drawFooter(ctx);
  
  // ==================== TWO COLUMNS LAYOUT ====================
  const colWidth = (CONTENT_WIDTH - 30) / 2; // 30px gap between columns
  const leftColX = LEFT_MARGIN;
  const rightColX = LEFT_MARGIN + colWidth + 30;
  
  // Left column: "Informações Gerais"
  const leftColStartY = ctx.y;
  
  ctx.page.drawText("Informacoes Gerais", {
    x: leftColX,
    y: ctx.y,
    size: 12,
    font: helveticaBold,
    color: colors.gray,
  });
  ctx.y -= 18;
  
  // Left column data
  const leftData = [
    { label: "Numero da Assistencia:", value: `#${assistance.assistance_number || "N/A"}` },
    { label: "Titulo:", value: assistance.title },
    { label: "Estado:", value: getStatusLabel(assistance.status) },
    { label: "Prioridade:", value: getPriorityLabel(assistance.priority) },
    { label: "Criado em:", value: formatDate(assistance.created_at) },
  ];
  
  for (const item of leftData) {
    ctx.page.drawText(item.label, {
      x: leftColX,
      y: ctx.y,
      size: 11,
      font: helveticaBold,
      color: colors.text,
    });
    
    // Value on next line or same line depending on length
    const labelWidth = helveticaBold.widthOfTextAtSize(item.label, 11);
    const valueLines = splitTextIntoLines(item.value, helvetica, 11, colWidth - labelWidth - 10);
    
    // First line next to label
    ctx.page.drawText(valueLines[0] || "", {
      x: leftColX + labelWidth + 4,
      y: ctx.y,
      size: 11,
      font: helvetica,
      color: colors.text,
    });
    ctx.y -= 16;
    
    // Additional lines below (indented)
    for (let i = 1; i < valueLines.length; i++) {
      ctx.page.drawText(valueLines[i], {
        x: leftColX + 5,
        y: ctx.y,
        size: 11,
        font: helvetica,
        color: colors.text,
      });
      ctx.y -= 16;
    }
    
    ctx.y -= 2;
  }
  
  // Right column: "Detalhes Técnicos"
  let rightY = leftColStartY;
  
  ctx.page.drawText("Detalhes Tecnicos", {
    x: rightColX,
    y: rightY,
    size: 12,
    font: helveticaBold,
    color: colors.gray,
  });
  rightY -= 18;
  
  // Right column data
  const rightData = [
    { label: "Edificio:", value: assistance.buildings?.name || "N/A" },
    { label: "NIF do Condominio:", value: assistance.buildings?.nif || "N/A" },
    { label: "Morada Completa:", value: assistance.buildings?.address || "N/A" },
    { label: "Codigo Postal:", value: extractPostalCode(assistance.buildings?.address) || "N/A" },
    { label: "Tipo de Intervencao:", value: assistance.intervention_types?.name || "N/A" },
    { label: "Fornecedor:", value: assistance.suppliers?.name || "Nao atribuido" },
  ];
  
  for (const item of rightData) {
    ctx.page.drawText(item.label, {
      x: rightColX,
      y: rightY,
      size: 11,
      font: helveticaBold,
      color: colors.text,
    });
    
    const labelWidth = helveticaBold.widthOfTextAtSize(item.label, 11);
    const valueLines = splitTextIntoLines(item.value, helvetica, 11, colWidth - labelWidth - 10);
    
    // First line next to label
    ctx.page.drawText(valueLines[0] || "", {
      x: rightColX + labelWidth + 4,
      y: rightY,
      size: 11,
      font: helvetica,
      color: colors.text,
    });
    rightY -= 16;
    
    // Additional lines below (indented)
    for (let i = 1; i < valueLines.length; i++) {
      ctx.page.drawText(valueLines[i], {
        x: rightColX + 5,
        y: rightY,
        size: 11,
        font: helvetica,
        color: colors.text,
      });
      rightY -= 16;
    }
    
    rightY -= 2;
  }
  
  // Set y to the lower of the two columns
  ctx.y = Math.min(ctx.y, rightY) - 15;
  
  // ==================== DESCRIPTION SECTION ====================
  if (assistance.description) {
    await ensureSpace(ctx, 50, logoImage, logoBytes);
    
    ctx.page.drawText("Descricao", {
      x: LEFT_MARGIN,
      y: ctx.y,
      size: 12,
      font: helveticaBold,
      color: colors.gray,
    });
    ctx.y -= 16;
    
    const descLines = splitTextIntoLines(assistance.description, helvetica, 9, CONTENT_WIDTH);
    for (const line of descLines.slice(0, 10)) {
      await ensureSpace(ctx, 14, logoImage, logoBytes);
      ctx.page.drawText(line, {
        x: LEFT_MARGIN,
        y: ctx.y,
        size: 9,
        font: helvetica,
        color: colors.gray,
      });
      ctx.y -= 13;
    }
    ctx.y -= 10;
  }
  
  // ==================== MAGIC CODE SECTION ====================
  if (magicCode) {
    const codeHeight = 55;
    await ensureSpace(ctx, codeHeight, logoImage, logoBytes);
    
    ctx.page.drawRectangle({
      x: LEFT_MARGIN,
      y: ctx.y - codeHeight,
      width: CONTENT_WIDTH,
      height: codeHeight,
      color: rgb(1, 0.98, 0.92),
      borderColor: rgb(0.96, 0.72, 0.20),
      borderWidth: 1.5,
    });
    
    ctx.page.drawText("CODIGO DE ACESSO AO PORTAL", {
      x: LEFT_MARGIN + 10,
      y: ctx.y - 15,
      size: 10,
      font: helveticaBold,
      color: rgb(0.65, 0.38, 0.05),
    });
    
    ctx.page.drawText(magicCode, {
      x: LEFT_MARGIN + 10,
      y: ctx.y - 35,
      size: 18,
      font: helveticaBold,
      color: colors.text,
    });
    
    ctx.page.drawText("Portal: condo-assist.lovable.app/fornecedor", {
      x: LEFT_MARGIN + 10,
      y: ctx.y - 50,
      size: 8,
      font: helvetica,
      color: colors.gray,
    });
    
    ctx.y -= codeHeight + 15;
  }
  
  // === PHOTOS SECTION ===
  if (photos && photos.length > 0) {
    ctx.y -= 10;
    await drawPhotosSection(ctx, photos, pdfDoc, logoImage, logoBytes);
  }
  
  // Update page count on all pages
  const totalPages = pdfDoc.getPageCount();
  if (totalPages > 1) {
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const pageNumText = `Pagina ${i + 1} de ${totalPages}`;
      pages[i].drawText(pageNumText, {
        x: PAGE_WIDTH - RIGHT_MARGIN - helvetica.widthOfTextAtSize(pageNumText, 7),
        y: 10,
        size: 7,
        font: helvetica,
        color: colors.gray,
      });
    }
  }
  
  return await pdfDoc.save();
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-assistance-pdf-to-admin function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      assistanceId, 
      adminEmail, 
      magicCode, 
      customMessage, 
      mode = 'archive',
      includePhotos = true 
    }: RequestBody = await req.json();

    if (!assistanceId) {
      throw new Error("assistanceId is required");
    }

    const isArchiveMode = mode === 'archive' || !magicCode;
    console.log(`Fetching assistance data for ID: ${assistanceId} (mode: ${isArchiveMode ? 'archive' : 'forward'}, photos: ${includePhotos})`);

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

    // Fetch photos if requested
    let photos: PhotoData[] = [];
    if (includePhotos) {
      const { data: photosData, error: photosError } = await supabase
        .from("assistance_photos")
        .select("id, file_url, caption, photo_type, created_at")
        .eq("assistance_id", assistanceId)
        .order("created_at", { ascending: true });
      
      if (photosError) {
        console.error("Error fetching photos:", photosError);
      } else {
        photos = photosData || [];
        console.log(`Found ${photos.length} photos for assistance`);
      }
    }

    // Get admin email from settings if not provided
    let targetEmail = adminEmail;
    
    if (!targetEmail) {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "admin_email")
        .single();
      
      if (setting?.value) {
        targetEmail = String(setting.value);
        console.log("Admin email from settings:", targetEmail);
      } else {
        targetEmail = "geral@luvimg.com";
        console.log("Using default admin email:", targetEmail);
      }
    }

    console.log("Target email for PDF:", targetEmail);

    // Generate the PDF with photos
    const pdfBytes = await generateRealPDF(
      assistance as unknown as AssistanceData, 
      isArchiveMode ? undefined : magicCode,
      photos
    );
    const pdfBase64 = base64Encode(pdfBytes);

    console.log("PDF generated, size:", pdfBytes.length, "bytes, pages:", Math.ceil(pdfBytes.length / 50000));

    // Prepare email content
    const assistanceNumber = assistance.assistance_number || "N/A";
    const supplierName = (assistance as any).suppliers?.name || "Nao atribuido";
    const buildingName = (assistance as any).buildings?.name || "N/A";
    
    const emailSubject = isArchiveMode 
      ? `[Arquivo] Assistencia #${assistanceNumber} - ${assistance.title}`
      : `Assistencia #${assistanceNumber} - ${assistance.title}`;
    
    const photosInfo = photos.length > 0 
      ? `<p style="color: #059669; font-size: 12px; margin-top: 10px;">📷 ${photos.length} ${photos.length === 1 ? 'fotografia incluida' : 'fotografias incluidas'} no PDF</p>`
      : '';
    
    const emailContent = isArchiveMode
      ? `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 30px; border-radius: 16px;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #0891b2; margin: 0; font-size: 24px;">📋 Arquivo de Assistencia</h1>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <h2 style="color: #0c4a6e; margin: 0 0 8px 0; font-size: 18px;">Assistencia #${assistanceNumber}</h2>
              <p style="color: #475569; margin: 0; font-size: 14px;">${assistance.title}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                  <strong style="color: #64748b;">Edificio:</strong>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
                  ${buildingName}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                  <strong style="color: #64748b;">Fornecedor:</strong>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
                  ${supplierName}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0;">
                  <strong style="color: #64748b;">Estado:</strong>
                </td>
                <td style="padding: 10px 0; color: #1e293b;">
                  ${getStatusLabel(assistance.status)}
                </td>
              </tr>
            </table>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 13px;">
                📎 O PDF completo da assistencia esta anexado a este email.
              </p>
              ${photosInfo}
            </div>
          </div>
          
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
            Luvimg - Administracao de Condominios
          </p>
        </div>
      `
      : `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 30px; border-radius: 16px;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #0891b2; margin: 0; font-size: 24px;">📧 Encaminhamento de Assistencia</h1>
            </div>
            
            ${customMessage ? `
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
                <p style="margin: 0; color: #166534; font-size: 14px;">${customMessage}</p>
              </div>
            ` : ''}
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <h2 style="color: #0c4a6e; margin: 0 0 8px 0; font-size: 18px;">Assistencia #${assistanceNumber}</h2>
              <p style="color: #475569; margin: 0; font-size: 14px;">${assistance.title}</p>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 13px;">
                📎 O PDF completo com o codigo de acesso esta anexado.
              </p>
              ${photosInfo}
            </div>
          </div>
        </div>
      `;

    // Send email with PDF attachment
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Luvimg - Administração de Condomínios <geral@luvimg.com>",
      to: [targetEmail],
      subject: emailSubject,
      html: emailContent,
      attachments: [
        {
          filename: `assistencia-${assistanceNumber}.pdf`,
          content: pdfBase64,
          content_type: "application/pdf",
        },
      ],
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log("Email sent successfully:", emailData);

    // Log email in database
    await supabase.from("email_logs").insert({
      assistance_id: assistanceId,
      recipient_email: targetEmail,
      subject: emailSubject,
      status: "sent",
      template_used: isArchiveMode ? "archive_pdf" : "forward_pdf",
      metadata: { 
        mode, 
        hasCustomMessage: !!customMessage,
        pdfSize: pdfBytes.length,
        photosIncluded: photos.length,
        emailId: emailData?.id 
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "PDF enviado com sucesso",
        emailId: emailData?.id,
        pdfSize: pdfBytes.length,
        photosIncluded: photos.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-assistance-pdf-to-admin:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
};

serve(handler);
