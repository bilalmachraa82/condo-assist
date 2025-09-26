
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

    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

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

    // Send email with magic code using enhanced template
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
          },
          from: 'Luvimg - Administração de Condomínios <arquivo@luvimg.com>'
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

// Types for session validation response
interface SessionValidationResponse {
  valid: boolean;
  supplier?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    specialization: string;
  };
  assistance_id?: string;
  last_used_at?: string;
  access_count?: number;
  error?: string;
  recently_expired_extended?: boolean;
}

/**
 * Validates a magic code and creates/refreshes a supplier session using the existing validation function
 * @param code - The magic code to validate
 * @returns Promise<{isValid: boolean, supplier?: any, assistanceId?: string, sessionInfo?: any}>
 */
export const validateMagicCode = async (code: string): Promise<{
  isValid: boolean;
  supplier?: any;
  assistanceId?: string;
  sessionInfo?: any;
}> => {
  try {
    // Use the simplified validation function to avoid transaction issues
    const { data, error } = await supabase.rpc(
      'validate_supplier_session_simple',
      { 
        p_magic_code: code.toUpperCase()
      }
    );

    if (error) {
      console.error('Error validating magic code:', error);
      return { isValid: false };
    }

    // Cast the response to our expected type
    const sessionData = data as unknown as SessionValidationResponse;

    return {
      isValid: sessionData?.valid || false,
      supplier: sessionData?.supplier,
      assistanceId: sessionData?.assistance_id,
      sessionInfo: sessionData
    };
  } catch (error) {
    console.error('Unexpected error validating magic code:', error);
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
