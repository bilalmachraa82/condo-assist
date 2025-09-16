import { z } from "zod";

// Input sanitization utilities
export const sanitizeInput = {
  // Remove potentially dangerous HTML/script tags
  html: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },

  // Sanitize SQL-like patterns (basic protection)
  sql: (input: string): string => {
    return input
      .replace(/['";\\]/g, '')
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE)\b/gi, '')
      .replace(/--.*$/gm, '')
      .replace(/\/\*.*?\*\//g, '');
  },

  // Basic XSS protection
  xss: (input: string): string => {
    return input
      .replace(/[<>'"&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match] || match;
      });
  },

  // Sanitize file paths
  filePath: (input: string): string => {
    return input
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*\\]/g, '')
      .replace(/^\/+|\/+$/g, '');
  },

  // Sanitize email addresses
  email: (input: string): string => {
    return input.toLowerCase().trim();
  },

  // Sanitize phone numbers
  phone: (input: string): string => {
    return input.replace(/[^\d+\-\s()]/g, '');
  }
};

// Validation schemas with security considerations
export const securitySchemas = {
  magicCode: z.string()
    .min(8, "Código deve ter pelo menos 8 caracteres")
    .max(32, "Código não pode ter mais de 32 caracteres")
    .regex(/^[A-Z0-9]+$/, "Código deve conter apenas letras maiúsculas e números"),

  email: z.string()
    .email("Email inválido")
    .max(254, "Email muito longo")
    .refine((email) => !email.includes('..'), "Email contém caracteres inválidos"),

  supplierNotes: z.string()
    .max(2000, "Notas não podem ter mais de 2000 caracteres")
    .refine((notes) => !notes.includes('<script'), "Conteúdo não permitido"),

  uploadFileName: z.string()
    .max(255, "Nome do ficheiro muito longo")
    .refine((name) => !/[<>:"|?*\\]/.test(name), "Nome contém caracteres inválidos"),

  ipAddress: z.string()
    .refine((ip) => {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }, "Endereço IP inválido")
};

// Rate limiting utilities
export class RateLimiter {
  private static attempts = new Map<string, { count: number; lastAttempt: number }>();
  private static readonly WINDOW_MS = 60 * 1000; // 1 minute
  
  static isAllowed(identifier: string, maxAttempts: number = 10): boolean {
    const now = Date.now();
    const key = identifier;
    
    const existing = this.attempts.get(key);
    
    if (!existing) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if window has passed
    if (now - existing.lastAttempt > this.WINDOW_MS) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Increment counter
    existing.count++;
    existing.lastAttempt = now;
    
    return existing.count <= maxAttempts;
  }
  
  static getRemainingAttempts(identifier: string, maxAttempts: number = 10): number {
    const existing = this.attempts.get(identifier);
    if (!existing) return maxAttempts;
    
    const now = Date.now();
    if (now - existing.lastAttempt > this.WINDOW_MS) {
      return maxAttempts;
    }
    
    return Math.max(0, maxAttempts - existing.count);
  }
}

// Security headers utility
export const getSecurityHeaders = () => {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://zmpitnpmplemfozvtbam.supabase.co",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://zmpitnpmplemfozvtbam.supabase.co",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
};