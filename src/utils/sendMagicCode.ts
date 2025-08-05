import { supabase } from "@/integrations/supabase/client";

export async function sendMagicCodeToSupplier(
  supplierId: string, 
  supplierEmail: string, 
  supplierName: string,
  assistanceDetails?: {
    title: string;
    priority: string;
    buildingName: string;
    interventionType: string;
    description?: string;
  }
) {
  try {
    // Generate and store magic code
    const { data: magicCodeData, error: magicCodeError } = await supabase
      .rpc('generate_magic_code');

    if (magicCodeError) throw magicCodeError;

    const magicCode = magicCodeData;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    // Store magic code in database
    const { error: insertError } = await supabase
      .from('supplier_magic_codes')
      .insert({
        supplier_id: supplierId,
        magic_code: magicCode,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) throw insertError;

    // Prepare email content based on context
    const isNewAssistance = assistanceDetails;
    const subject = isNewAssistance 
      ? 'Nova Assistência Atribuída - Portal do Fornecedor'
      : 'Código de Acesso - Portal do Fornecedor';

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'critical': return '#ef4444';
        case 'urgent': return '#f97316';
        default: return '#10b981';
      }
    };

    const getPriorityLabel = (priority: string) => {
      switch (priority) {
        case 'critical': return 'CRÍTICO';
        case 'urgent': return 'URGENTE';
        default: return 'NORMAL';
      }
    };

    // Send email with magic code using enhanced template
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: supplierEmail,
        subject,
        template: 'magic_code',
        data: {
          supplierName,
          magicCode,
          assistanceDetails,
          portalUrl: `${window.location.origin}/supplier-portal?code=${magicCode}`
        },
        from: 'Luvimg - Administração de Condomínios <arquivo@luvimg.com>'
      }
    });

    if (emailError) throw emailError;

    return { success: true, magicCode };
  } catch (error) {
    console.error('Error sending magic code:', error);
    throw error;
  }
}