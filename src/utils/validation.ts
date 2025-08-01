import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string()
  .min(1, "Email é obrigatório")
  .email("Email inválido");

export const phoneSchema = z.string()
  .min(1, "Telefone é obrigatório")
  .regex(/^[+]?[\d\s()-]+$/, "Formato de telefone inválido");

export const nifSchema = z.string()
  .min(9, "NIF deve ter pelo menos 9 dígitos")
  .regex(/^\d{9}$/, "NIF deve conter apenas números");

export const nameSchema = z.string()
  .min(2, "Nome deve ter pelo menos 2 caracteres")
  .max(100, "Nome não pode exceder 100 caracteres");

export const passwordSchema = z.string()
  .min(8, "Password deve ter pelo menos 8 caracteres")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password deve conter pelo menos: 1 minúscula, 1 maiúscula e 1 número");

export const urlSchema = z.string()
  .url("URL inválida")
  .optional()
  .or(z.literal(""));

// Sanitization functions
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

export const sanitizeHTML = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizePhoneNumber = (phone: string): string => {
  return phone.replace(/[^\d+()-\s]/g, '');
};

export const sanitizeNIF = (nif: string): string => {
  return nif.replace(/\D/g, '');
};

// Validation utilities
export const validateFile = (file: File, options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
}) => {
  const errors: string[] = [];

  if (options.maxSize && file.size > options.maxSize) {
    errors.push(`Ficheiro demasiado grande. Máximo: ${options.maxSize / 1024 / 1024}MB`);
  }

  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push(`Tipo de ficheiro não permitido. Permitidos: ${options.allowedTypes.join(', ')}`);
  }

  return errors;
};

export const validateImageFile = (file: File) => {
  return validateFile(file, {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  });
};

export const validatePDFFile = (file: File) => {
  return validateFile(file, {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf']
  });
};

// Rate limiting utilities
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, number[]>();

  return (key: string): boolean => {
    const now = Date.now();
    const userRequests = requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limited
    }
    
    validRequests.push(now);
    requests.set(key, validRequests);
    return true; // Request allowed
  };
};

// Form validation helpers
export const createFormValidator = <T>(schema: z.ZodSchema<T>) => {
  return {
    validate: (data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
      try {
        const validated = schema.parse(data);
        return { success: true, data: validated };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            success: false,
            errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
          };
        }
        return { success: false, errors: ['Erro de validação'] };
      }
    },
    
    validateField: (fieldName: keyof T, value: unknown): string | null => {
      try {
        // Simple field validation by parsing with the full schema
        // and only checking for errors related to this field
        schema.parse({ [fieldName]: value } as Partial<T>);
        return null;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors.find(err => 
            err.path.length > 0 && err.path[0] === fieldName
          );
          return fieldError?.message || 'Erro de validação';
        }
        return 'Erro de validação';
      }
    }
  };
};