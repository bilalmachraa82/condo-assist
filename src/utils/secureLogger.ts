// Secure logger that prevents sensitive data exposure in production
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('lovable');

interface LogLevel {
  ERROR: 'error';
  WARN: 'warn'; 
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info', 
  DEBUG: 'debug'
};

class SecureLogger {
  private static instance: SecureLogger;
  private isProductionMode: boolean;

  private constructor() {
    this.isProductionMode = isProduction;
  }

  static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Remove sensitive patterns
      return data
        .replace(/([a-zA-Z0-9]{20,})/g, '[TOKEN_REDACTED]') // Long tokens
        .replace(/[A-Z0-9]{8,16}/g, '[CODE_REDACTED]') // Magic codes
        .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]') // Bearer tokens
        .replace(/api[_-]?key[:\s=]+[^\s,}]+/gi, 'api_key: [REDACTED]') // API keys
        .replace(/password[:\s=]+[^\s,}]+/gi, 'password: [REDACTED]'); // Passwords
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};
      
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        // Skip sensitive fields entirely
        if (lowerKey.includes('token') || 
            lowerKey.includes('password') || 
            lowerKey.includes('secret') ||
            lowerKey.includes('key') ||
            lowerKey.includes('magic') ||
            lowerKey === 'authorization') {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private shouldLog(level: string): boolean {
    if (this.isProductionMode) {
      // In production, only log errors and warnings
      return level === LOG_LEVELS.ERROR || level === LOG_LEVELS.WARN;
    }
    return true; // Log everything in development
  }

  error(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(`🔒 [SECURE] ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(`🔒 [SECURE] ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.info(`🔒 [SECURE] ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(`🔒 [SECURE] ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  // Special method for development-only logging
  devOnly(message: string, data?: any): void {
    if (!this.isProductionMode) {
      console.log(`🚧 [DEV-ONLY] ${message}`, data);
    }
  }
}

export const secureLogger = SecureLogger.getInstance();
export { LOG_LEVELS };