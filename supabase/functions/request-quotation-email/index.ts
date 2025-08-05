import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuotationRequest {
  assistance_id: string;
  supplier_id: string;
  supplier_email: string;
  supplier_name: string;
  assistance_title: string;
  assistance_description: string;
  building_name: string;
  deadline?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      assistance_id,
      supplier_id,
      supplier_email,
      supplier_name,
      assistance_title,
      assistance_description,
      building_name,
      deadline
    }: QuotationRequest = await req.json();

    console.log(`Sending quotation request email to: ${supplier_email} for assistance: ${assistance_id}`);

    // Generate magic code for supplier portal access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate magic code
    const { data: magicCodeData, error: magicCodeError } = await supabase
      .rpc('generate_magic_code');

    if (magicCodeError) {
      console.error('Error generating magic code:', magicCodeError);
      throw magicCodeError;
    }

    const magicCode = magicCodeData;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Store magic code
    const { error: insertError } = await supabase
      .from('supplier_magic_codes')
      .insert({
        supplier_id,
        assistance_id,
        magic_code: magicCode,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error storing magic code:', insertError);
      throw insertError;
    }

    const portalUrl = `https://zmpitnpmplemfozvtbam.supabase.co/supplier-portal?code=${magicCode}`;
    console.log(`Generated portal URL: ${portalUrl}`);

    const deadlineText = deadline 
      ? `<p style="color: #d97706; font-weight: bold;">⏰ Prazo para submissão: ${new Date(deadline).toLocaleDateString('pt-PT')}</p>`
      : '';

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Solicitação de Orçamento - Luvimg</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <img src="/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png" alt="Luvimg Logo" style="width: 64px; height: 64px; margin-bottom: 20px; border-radius: 8px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Solicitação de Orçamento</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Luvimg - Gestão de Assistências</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Olá <strong>${supplier_name}</strong>,</p>
          
          <p>Foi solicitado um orçamento para a seguinte assistência:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #667eea;">${assistance_title}</h3>
            <p style="margin: 5px 0;"><strong>Edifício:</strong> ${building_name}</p>
            <p style="margin: 5px 0;"><strong>Descrição:</strong> ${assistance_description}</p>
            ${deadlineText}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Submeter Orçamento
            </a>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Código de Acesso:</strong> <span style="font-family: monospace; font-size: 18px; color: #1976d2;">${magicCode}</span><br>
              <em>Este código é válido por 24 horas e permite acesso direto ao portal do fornecedor.</em>
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Se não conseguir aceder através do link, pode usar o código de acesso diretamente no portal do fornecedor.
          </p>
          
          <p style="font-size: 14px; color: #666;">
            Este email foi enviado automaticamente pelo sistema de gestão de assistências da Luvimg.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email using enhanced send-email function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const emailResponse = await supabaseClient.functions.invoke('send-email', {
      body: {
        to: supplier_email,
        subject: `Solicitação de Orçamento - ${assistance_title}`,
        template: 'magic_code',
        data: {
          supplierName: supplier_name,
          magicCode,
          assistanceDetails: {
            title: assistance_title,
            priority: 'normal',
            buildingName: building_name,
            interventionType: 'Orçamento Solicitado',
            description: assistance_description
          },
          portalUrl: `https://zmpitnpmplemfozvtbam.supabase.co/supplier-portal?code=${magicCode}`
        },
        from: 'Luvimg - Administração de Condomínios <arquivo@luvimg.com>'
      }
    });

    console.log("Quotation request email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse,
      magic_code: magicCode
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in request-quotation-email function:", error);
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