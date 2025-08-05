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

    // Send email with magic code
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: supplierEmail,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
               <div style="background: linear-gradient(135deg, #5FB3B3, #7BC4C4); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                 <img src="https://zmpitnpmplemfozvtbam.supabase.co/storage/v1/object/public/assistance-photos/9e67bd21-c565-405a-918d-e9aac10336e8.png" alt="Luvimg" style="height: 40px; width: auto; margin-bottom: 15px;" />
                 <h1 style="color: white; margin: 0; font-size: 24px;">${isNewAssistance ? 'Nova Assistência Atribuída' : 'Acesso ao Portal do Fornecedor'}</h1>
               </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
              <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Olá ${supplierName},</p>
              
              ${isNewAssistance ? `
               <div style="background-color: #f8fafc; border-left: 4px solid ${getPriorityColor(assistanceDetails.priority)}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                 <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📋 ${assistanceDetails.title}</h3>
                 <div style="display: flex; flex-wrap: wrap; gap: 15px; margin: 15px 0;">
                   <div style="background-color: ${getPriorityColor(assistanceDetails.priority)}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold;">
                     🚨 ${getPriorityLabel(assistanceDetails.priority)}
                   </div>
                 </div>
                 <p style="color: #6b7280; margin: 10px 0 5px 0; font-size: 14px;"><strong>🏢 Edifício:</strong> ${assistanceDetails.buildingName}</p>
                 <p style="color: #6b7280; margin: 5px 0; font-size: 14px;"><strong>🔧 Tipo:</strong> ${assistanceDetails.interventionType}</p>
                 ${assistanceDetails.description ? `<p style="color: #6b7280; margin: 15px 0 5px 0; font-size: 14px;"><strong>📝 Descrição:</strong></p>
                 <p style="color: #4b5563; margin: 5px 0; font-size: 14px; font-style: italic;">${assistanceDetails.description}</p>` : ''}
               </div>
                <p style="color: #374151; font-size: 16px; margin: 25px 0 15px 0;">Para aceitar e gerir esta assistência, aceda ao portal do fornecedor:</p>
              ` : `
                <p style="color: #374151; font-size: 16px; margin: 25px 0 15px 0;">Utilize o código abaixo para aceder ao portal do fornecedor:</p>
              `}
              
              <div style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0); padding: 25px; text-align: center; margin: 25px 0; border-radius: 12px; border: 2px dashed #cbd5e1;">
                <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">CÓDIGO DE ACESSO</p>
                <h2 style="color: #2563eb; font-size: 32px; margin: 10px 0; letter-spacing: 0.3em; font-weight: bold;">${magicCode}</h2>
                <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">Válido por 30 dias</p>
              </div>
              
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${window.location.origin}/supplier-portal?code=${magicCode}" 
                     style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                    🚀 Aceder ao Portal
                  </a>
                </div>
              
              ${isNewAssistance ? `
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
                  <p style="color: #92400e; margin: 0; font-size: 14px;">
                    ⏰ <strong>Ação Necessária:</strong> Por favor, aceda ao portal para aceitar ou recusar esta assistência o mais breve possível.
                  </p>
                </div>
              ` : ''}
              
              <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
                <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
                  <strong>Luvimg - Administração de Condomínios</strong><br>
                  Praceta Pedro Manuel Pereira nº 1 – 1º esq, 2620-158 Póvoa Santo Adrião<br>
                  Tel: +351 219 379 248 | Email: arquivo@luvimg.com<br>
                  Este código expira automaticamente em 30 dias por motivos de segurança.
                </p>
              </div>
            </div>
          </div>
        `,
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