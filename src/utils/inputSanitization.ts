import { z } from "zod";

// Enhanced client-side magic code validation
export const validateMagicCodeFormat = (code: string): { isValid: boolean; error?: string } => {
  if (!code || typeof code !== 'string') {
    return { isValid: false, error: 'Magic code is required' };
  }
  
  if (code.length !== 8) {
    return { isValid: false, error: 'Magic code must be 8 characters long' };
  }
  
  if (!/^[A-Z0-9]{8}$/.test(code)) {
    return { isValid: false, error: 'Magic code must contain only uppercase letters and numbers' };
  }
  
  return { isValid: true };
};

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

// Enhanced Rate Limiter Class with better security
export class RateLimiter {
  private static attempts: Map<string, { count: number; resetTime: number; blocked?: boolean }> = new Map();
  private static readonly WINDOW_MS = 3600000; // 1 hour
  private static readonly BLOCK_DURATION_MS = 900000; // 15 minutes block

  static isAllowed(identifier: string, maxAttempts: number = 10): boolean {
    const now = Date.now();
    const key = identifier;
    const current = this.attempts.get(key);

    if (!current || now > current.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.WINDOW_MS });
      return true;
    }

    // Check if currently blocked
    if (current.blocked && now < current.resetTime) {
      return false;
    }

    if (current.count >= maxAttempts) {
      // Block the identifier for 15 minutes after max attempts
      current.blocked = true;
      current.resetTime = now + this.BLOCK_DURATION_MS;
      return false;
    }

    current.count++;
    return true;
  }

  static getRemainingAttempts(identifier: string, maxAttempts: number = 10): number {
    const current = this.attempts.get(identifier);
    if (!current || Date.now() > current.resetTime) {
      return maxAttempts;
    }
    if (current.blocked) {
      return 0;
    }
    return Math.max(0, maxAttempts - current.count);
  }

  static isBlocked(identifier: string): boolean {
    const current = this.attempts.get(identifier);
    return current?.blocked === true && Date.now() < current.resetTime;
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