import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://547ef223-c1fa-45ad-b53c-1ad4427f0d14.lovableproject.com';

interface EmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  template?: string;
  data?: any;
  bcc?: string | string[];
}

// Enhanced email template for maximum Outlook compatibility
const createOutlookCompatibleTemplate = (data: any) => {
  const { 
    supplierName = "Fornecedor", 
    magicCode = "", 
    assistanceDetails = null,
    portalUrl = ""
  } = data;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'urgent': return '#ea580c';
      default: return '#059669';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'CRÍTICO';
      case 'urgent': return 'URGENTE';
      default: return 'NORMAL';
    }
  };

  // Use tables for maximum Outlook compatibility
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${assistanceDetails ? 'Nova Assistência Atribuída' : 'Acesso ao Portal do Fornecedor'}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Outlook-specific styles */
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    p { display: block; margin: 13px 0; }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .dark-mode-text { color: #f9fafb !important; }
      .dark-mode-bg { background-color: #1f2937 !important; }
      .dark-mode-card { background-color: #374151 !important; }
    }
    
    /* Mobile responsiveness */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .content { padding: 20px !important; }
      .button { width: 100% !important; display: block !important; }
    }
  </style>
</head>
<body style="background-color: #f3f4f6; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  
  <!-- Main container -->
  <table role="presentation" style="width: 100%; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        
        <!-- Email wrapper -->
        <table role="presentation" class="container" style="width: 100%; max-width: 600px; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with logo and gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <img src="cid:luvimg-logo" 
                         alt="Luvimg" 
                         style="height: 50px; width: auto; margin-bottom: 15px; display: block;" />
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-weight: 600; line-height: 1.2;">
                      ${assistanceDetails ? 'Nova Assistência Atribuída' : 'Acesso ao Portal do Fornecedor'}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td class="content" style="padding: 30px 20px; background-color: #ffffff;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                
                <!-- Greeting -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="color: #374151; font-size: 16px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; line-height: 1.5;">
                      Olá <strong>${supplierName}</strong>,
                    </p>
                  </td>
                </tr>
                
                ${assistanceDetails ? `
                <!-- Assistance details card -->
                <tr>
                  <td style="padding-bottom: 25px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-left: 4px solid ${getPriorityColor(assistanceDetails.priority)}; border-radius: 0 8px 8px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-weight: 600;">
                            📋 ${assistanceDetails.title}
                          </h3>
                          
                          <!-- Priority badge -->
                          <table role="presentation" style="margin: 15px 0;">
                            <tr>
                              <td style="background-color: ${getPriorityColor(assistanceDetails.priority)}; color: #ffffff; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: bold; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                                🚨 ${getPriorityLabel(assistanceDetails.priority)}
                              </td>
                            </tr>
                          </table>
                          
                          <p style="color: #6b7280; margin: 10px 0 5px 0; font-size: 14px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            <strong>🏢 Edifício:</strong> ${assistanceDetails.buildingName}${assistanceDetails.buildingNif ? ` (NIF: ${assistanceDetails.buildingNif})` : ''}
                          </p>
                          <p style="color: #6b7280; margin: 5px 0; font-size: 14px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            <strong>🔧 Tipo:</strong> ${assistanceDetails.interventionType}
                          </p>
                          ${assistanceDetails.description ? `
                          <p style="color: #6b7280; margin: 15px 0 5px 0; font-size: 14px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            <strong>📝 Descrição:</strong>
                          </p>
                          <p style="color: #4b5563; margin: 5px 0; font-size: 14px; font-style: italic; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            ${assistanceDetails.description}
                          </p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Action message -->
                <tr>
                  <td style="padding-bottom: 15px;">
                    <p style="color: #374151; font-size: 16px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; line-height: 1.5;">
                      Para aceitar e gerir esta assistência, aceda ao portal do fornecedor:
                    </p>
                  </td>
                </tr>
                ` : `
                <!-- Standard message -->
                <tr>
                  <td style="padding-bottom: 15px;">
                    <p style="color: #374151; font-size: 16px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; line-height: 1.5;">
                      Utilize o código abaixo para aceder ao portal do fornecedor:
                    </p>
                  </td>
                </tr>
                `}
                
                <!-- Magic code section -->
                <tr>
                  <td style="padding: 25px 0;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #f1f5f9, #e2e8f0); border: 2px dashed #cbd5e1; border-radius: 12px;">
                      <tr>
                        <td style="padding: 25px; text-align: center;">
                          <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            CÓDIGO DE ACESSO
                          </p>
                          <h2 style="color: #2563eb; font-size: 32px; margin: 10px 0; letter-spacing: 0.3em; font-weight: bold; font-family: 'Courier New', monospace;">
                            ${magicCode}
                          </h2>
                          <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            ${assistanceDetails ? 'Válido enquanto a assistência estiver ativa (mín. 30 dias)' : 'Válido por 30 dias'}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td style="padding: 30px 0; text-align: center;">
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${portalUrl}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="16%" fillcolor="#2563eb">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:'Segoe UI',sans-serif;font-size:16px;font-weight:600;">🚀 Aceder ao Portal</center>
                          </v:roundrect>
                          <![endif]-->
                          <a href="${portalUrl}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; mso-hide: all;">
                            🚀 Aceder ao Portal
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                ${assistanceDetails ? `
                <!-- Urgency notice -->
                <tr>
                  <td style="padding: 25px 0;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
                      <tr>
                        <td style="padding: 15px;">
                          <p style="color: #92400e; margin: 0; font-size: 14px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            ⏰ <strong>Ação Necessária:</strong> Por favor, aceda ao portal para aceitar ou recusar esta assistência o mais breve possível.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
                
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding: 20px; background-color: #f9fafb;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.4;">
                      <strong style="color: #374151;">Luvimg - Administração de Condomínios</strong><br>
                      Praceta Pedro Manuel Pereira nº 1 – 1º esq, 2620-158 Póvoa Santo Adrião<br>
                      Tel: +351 219 379 248 | Email: arquivo@luvimg.com<br>
                      <span style="font-size: 11px;">${assistanceDetails ? 'Este código permanece válido enquanto a assistência estiver ativa (mín. 30 dias).' : 'Este código expira automaticamente em 30 dias por motivos de segurança.'}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
  
  <!-- Tracking pixel for analytics -->
  <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="1" height="1" style="display: none;">
  
</body>
</html>`;
};

// Plain text version for better deliverability
const createPlainTextVersion = (data: any) => {
  const { 
    supplierName = "Fornecedor", 
    magicCode = "", 
    assistanceDetails = null,
    portalUrl = ""
  } = data;

  let text = `Olá ${supplierName},\n\n`;
  
  if (assistanceDetails) {
    text += `NOVA ASSISTÊNCIA ATRIBUÍDA\n\n`;
    text += `📋 ${assistanceDetails.title}\n`;
    text += `🚨 Prioridade: ${assistanceDetails.priority === 'critical' ? 'CRÍTICO' : assistanceDetails.priority === 'urgent' ? 'URGENTE' : 'NORMAL'}\n`;
    text += `🏢 Edifício: ${assistanceDetails.buildingName}${assistanceDetails.buildingNif ? ` (NIF: ${assistanceDetails.buildingNif})` : ''}\n`;
    text += `🔧 Tipo: ${assistanceDetails.interventionType}\n`;
    if (assistanceDetails.description) {
      text += `📝 Descrição: ${assistanceDetails.description}\n`;
    }
    text += `\nPara aceitar e gerir esta assistência, aceda ao portal do fornecedor:\n\n`;
  } else {
    text += `Utilize o código abaixo para aceder ao portal do fornecedor:\n\n`;
  }
  
  text += `CÓDIGO DE ACESSO: ${magicCode}\n`;
  text += `${assistanceDetails ? '(Válido enquanto a assistência estiver ativa - mínimo 30 dias)' : '(Válido por 30 dias)'}\n\n`;
  text += `Link direto: ${portalUrl}\n\n`;
  
  if (assistanceDetails) {
    text += `⏰ AÇÃO NECESSÁRIA: Por favor, aceda ao portal para aceitar ou recusar esta assistência o mais breve possível.\n\n`;
  }
  
  text += `---\n`;
  text += `Luvimg - Administração de Condomínios\n`;
  text += `Praceta Pedro Manuel Pereira nº 1 – 1º esq, 2620-158 Póvoa Santo Adrião\n`;
  text += `Tel: +351 219 379 248 | Email: arquivo@luvimg.com\n`;
  text += assistanceDetails ? `Este código permanece válido enquanto a assistência estiver ativa (mín. 30 dias).` : `Este código expira automaticamente em 30 dias por motivos de segurança.`;
  
  return text;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EmailRequest = await req.json();
    const { to, subject, html, text, from, template, data, bcc } = requestData;

    console.log(`Sending email to: ${to}, subject: ${subject}, template: ${template || 'custom'}`);

    let finalHtml = html;
    let finalText = text;

    // Generate template-based content if template is specified
    if (template === 'magic_code' && data) {
      finalHtml = createOutlookCompatibleTemplate(data);
      finalText = createPlainTextVersion(data);
    }

    // Ensure we have either HTML or text content
    if (!finalHtml && !finalText) {
      throw new Error("Missing 'html' or 'text' field. At least one is required.");
    }

    // Enhanced headers for better deliverability
    const emailPayload: any = {
      from: from || "Luvimg - Administração de Condomínios <arquivo@luvimg.com>",
      to: [to],
      subject: subject,
      reply_to: "arquivo@luvimg.com",
      headers: {
        'X-Entity-Ref-ID': `luvimg-${Date.now()}`,
        'X-Priority': '1', // High priority
        'Importance': 'high',
        'X-MSMail-Priority': 'High',
        'List-Unsubscribe': '<mailto:arquivo@luvimg.com?subject=unsubscribe>',
        'X-Mailer': 'Luvimg Portal v3.1.0'
      }
    };

    // Optional BCC
    if (bcc) {
      emailPayload.bcc = Array.isArray(bcc) ? bcc : [bcc];
    }

    // Add HTML content if available
    if (finalHtml) {
      emailPayload.html = finalHtml;
    }

    // Add plain text content if available (required for better deliverability)
    if (finalText) {
      emailPayload.text = finalText;
    }

    try {
      const logoCandidates = [
        'https://luvimg.com/assets/images/luvimg-logo.png',
        `${APP_BASE_URL.replace(/\/$/, '')}/logo-luvimg.png`,
        `${APP_BASE_URL.replace(/\/$/, '')}/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png`,
      ];
      let attached = false;
      for (const url of logoCandidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const arr = await res.arrayBuffer();
            const bytes = new Uint8Array(arr);
            emailPayload.attachments = [
              {
                filename: 'logo-luvimg.png',
                content: bytes,
                contentType: 'image/png',
                headers: { 'Content-ID': '<luvimg-logo>' },
                disposition: 'inline'
              }
            ];
            console.log('Attached logo from', url);
            attached = true;
            break;
          } else {
            console.warn('Logo fetch failed', url, res.status);
          }
        } catch (inner) {
          console.warn('Logo fetch error', url, inner);
        }
      }
      if (!attached) {
        console.warn('No logo could be attached. Proceeding without CID logo.');
      }
    } catch (e) {
      console.warn('Unable to attach inline logo:', e);
    }

    const emailResponse = await resend.emails.send(emailPayload);

    console.log("Email sent successfully:", emailResponse);

    // Enhanced logging for debugging
    if (template) {
      console.log(`Template '${template}' processed successfully`);
    }

    return new Response(JSON.stringify({
      ...emailResponse,
      template_used: template,
      delivery_info: {
        timestamp: new Date().toISOString(),
        recipient: to,
        template: template || 'custom'
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    
    console.error("Detailed error:", errorDetails);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: errorDetails
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);