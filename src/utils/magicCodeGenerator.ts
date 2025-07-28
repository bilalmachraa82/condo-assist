import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a new magic code for supplier access and sends it via email
 * @param supplierId - The ID of the supplier
 * @param assistanceId - Optional assistance ID to link the code to
 * @returns Promise<{code: string, expiresAt: string}> - The generated code and expiration
 */
export const generateAndSendMagicCode = async (
  supplierId: string, 
  assistanceId?: string
): Promise<{code: string, expiresAt: string}> => {
  try {
    // Generate new magic code using RPC function
    const { data: magicCode, error: magicError } = await supabase
      .rpc('generate_magic_code');

    if (magicError) throw magicError;

    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store magic code in database
    const { error: insertError } = await supabase
      .from('supplier_magic_codes')
      .insert({
        supplier_id: supplierId,
        magic_code: magicCode,
        expires_at: expiresAt.toISOString(),
        assistance_id: assistanceId || null
      });

    if (insertError) throw insertError;

    // Get supplier details for email
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('name, email')
      .eq('id', supplierId)
      .single();

    if (supplierError) throw supplierError;

    // Send email with magic code
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: supplier.email,
          subject: 'Código de Acesso - Portal do Fornecedor',
          template: 'magic_code',
          data: {
            supplierName: supplier.name,
            magicCode,
            expiresAt: expiresAt.toISOString(),
            portalUrl: `${window.location.origin}/supplier-portal?code=${magicCode}`
          }
        }
      });
    } catch (emailError) {
      console.error('Error sending magic code email:', emailError);
      // Don't fail the whole operation if email fails
    }

    return {
      code: magicCode,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('Error generating magic code:', error);
    throw error;
  }
};

/**
 * Validates a magic code and returns supplier information if valid
 * @param code - The magic code to validate
 * @returns Promise<{isValid: boolean, supplier?: any, assistance?: any}>
 */
export const validateMagicCode = async (code: string) => {
  try {
    // Check if code exists and is not expired
    const { data: magicCodeData, error } = await supabase
      .from("supplier_magic_codes")
      .select(`
        supplier_id,
        assistance_id,
        expires_at,
        suppliers (id, name, email, phone, address, specialization)
      `)
      .eq("magic_code", code.toUpperCase())
      .gt("expires_at", new Date().toISOString())
      .eq("is_used", false)
      .single();

    if (error || !magicCodeData) {
      return { isValid: false };
    }

    // Mark code as used (optional - depends on business logic)
    // await supabase
    //   .from("supplier_magic_codes")
    //   .update({ is_used: true })
    //   .eq("magic_code", code.toUpperCase());

    return {
      isValid: true,
      supplier: magicCodeData.suppliers,
      assistanceId: magicCodeData.assistance_id
    };
  } catch (error) {
    console.error('Error validating magic code:', error);
    return { isValid: false };
  }
};

/**
 * Cleanup expired magic codes (utility function)
 */
export const cleanupExpiredCodes = async () => {
  try {
    const { error } = await supabase
      .from("supplier_magic_codes")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error cleaning up expired codes:', error);
    return false;
  }
};