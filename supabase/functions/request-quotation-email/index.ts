
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log("🚀 Iniciando processamento de solicitação de orçamento");
    
    const requestBody = await req.json();
    console.log("📝 Dados recebidos:", JSON.stringify(requestBody, null, 2));

    const {
      assistance_id,
      supplier_id,
      supplier_email,
      supplier_name,
      assistance_title,
      assistance_description,
      building_name,
      deadline
    }: QuotationRequest = requestBody;

    // Validações básicas
    if (!assistance_id || !supplier_id || !supplier_email || !supplier_name) {
      console.error("❌ Dados obrigatórios em falta:", {
        assistance_id: !!assistance_id,
        supplier_id: !!supplier_id,
        supplier_email: !!supplier_email,
        supplier_name: !!supplier_name
      });
      
      return new Response(JSON.stringify({ 
        error: "Dados obrigatórios em falta",
        details: {
          assistance_id: !assistance_id ? "em falta" : "ok",
          supplier_id: !supplier_id ? "em falta" : "ok", 
          supplier_email: !supplier_email ? "em falta" : "ok",
          supplier_name: !supplier_name ? "em falta" : "ok"
        }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`📧 Preparando envio de email para: ${supplier_email} (${supplier_name})`);
    console.log(`🏢 Assistência: ${assistance_title} em ${building_name}`);

    // Generate magic code for supplier portal access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log("🔐 Gerando código mágico...");

    // Generate magic code
    const { data: magicCodeData, error: magicCodeError } = await supabase
      .rpc('generate_magic_code');

    if (magicCodeError) {
      console.error('❌ Erro ao gerar código mágico:', magicCodeError);
      throw new Error(`Erro ao gerar código mágico: ${magicCodeError.message}`);
    }

    const magicCode = magicCodeData;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    console.log(`✅ Código mágico gerado: ${magicCode}`);

    // Store magic code
    console.log("💾 Armazenando código mágico...");
    const { error: insertError } = await supabase
      .from('supplier_magic_codes')
      .insert({
        supplier_id,
        assistance_id,
        magic_code: magicCode,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('❌ Erro ao armazenar código mágico:', insertError);
      throw new Error(`Erro ao armazenar código mágico: ${insertError.message}`);
    }

    console.log("✅ Código mágico armazenado com sucesso");

    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://547ef223-c1fa-45ad-b53c-1ad4427f0d14.lovableproject.com';
    const portalUrl = `${APP_BASE_URL}/supplier-portal?code=${magicCode}`;
    console.log(`🔗 URL do portal gerado: ${portalUrl}`);

    const deadlineText = deadline 
      ? `<p style="color: #d97706; font-weight: bold;">⏰ Prazo para submissão: ${new Date(deadline).toLocaleDateString('pt-PT')}</p>`
      : '';

    console.log("📧 Invocando função send-email...");

    // Send email using enhanced send-email function
    const emailResponse = await supabase.functions.invoke('send-email', {
      body: {
        to: supplier_email,
        subject: `Solicitação de Orçamento - ${assistance_title}`,
        template: 'magic_code',
        bcc: 'arquivo@luvimg.com',
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
          portalUrl: portalUrl,
          deadline: deadline ? new Date(deadline).toLocaleDateString('pt-PT') : null
        },
        from: 'Luvimg - Administração de Condomínios <arquivo@luvimg.com>'
      }
    });

    if (emailResponse.error) {
      console.error("❌ Erro na função send-email:", emailResponse.error);
      throw new Error(`Erro ao enviar email: ${emailResponse.error.message || 'Erro desconhecido'}`);
    }

    console.log("✅ Email enviado com sucesso:", emailResponse.data);

    // Log successful email sending
    try {
      await supabase.from("email_logs").insert({
        recipient_email: supplier_email,
        subject: `Solicitação de Orçamento - ${assistance_title}`,
        status: "sent",
        assistance_id: assistance_id,
        supplier_id: supplier_id,
        template_used: "quotation_request",
        metadata: {
          magic_code: magicCode,
          portal_url: portalUrl,
          deadline: deadline
        }
      });
      console.log("✅ Log de email registado com sucesso");
    } catch (logError) {
      console.warn("⚠️ Erro ao registar log de email (continuando):", logError);
    }

    const response = {
      success: true,
      emailResponse: emailResponse.data,
      magic_code: magicCode,
      portal_url: portalUrl,
      message: `Email enviado com sucesso para ${supplier_email}`
    };

    console.log("🎉 Solicitação de orçamento processada com sucesso");
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    
  } catch (error: any) {
    console.error("💥 Erro crítico na função request-quotation-email:", error);
    console.error("Stack trace:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro interno do servidor",
        details: error.stack || "Sem stack trace disponível",
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
