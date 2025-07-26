import { supabase } from "@/integrations/supabase/client";

export async function sendMagicCodeToSupplier(supplierId: string, supplierEmail: string, supplierName: string) {
  try {
    // Generate and store magic code
    const { data: magicCodeData, error: magicCodeError } = await supabase
      .rpc('generate_magic_code');

    if (magicCodeError) throw magicCodeError;

    const magicCode = magicCodeData;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    // Store magic code in database
    const { error: insertError } = await supabase
      .from('supplier_magic_codes')
      .insert({
        supplier_id: supplierId,
        magic_code: magicCode,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) throw insertError;

    // Send email with magic code
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: supplierEmail,
        subject: 'Código de Acesso - Portal do Fornecedor',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Acesso ao Portal do Fornecedor</h2>
            <p>Olá ${supplierName},</p>
            <p>Utilize o código abaixo para aceder ao portal do fornecedor:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="color: #2563eb; font-size: 2em; margin: 0; letter-spacing: 0.2em;">${magicCode}</h1>
            </div>
            <p>Ou clique no link abaixo para aceder diretamente:</p>
            <a href="${window.location.origin}/supplier-portal?code=${magicCode}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Aceder ao Portal
            </a>
            <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
              Este código é válido por 24 horas. Se não solicitou este acesso, pode ignorar este email.
            </p>
          </div>
        `,
        from: 'Gestão de Assistências <onboarding@resend.dev>'
      }
    });

    if (emailError) throw emailError;

    return { success: true, magicCode };
  } catch (error) {
    console.error('Error sending magic code:', error);
    throw error;
  }
}