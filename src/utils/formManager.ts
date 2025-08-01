import { z } from 'zod';
import { showErrorToast, retryOperation } from '@/utils/errorHandler';

export interface FormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export interface OfflineOptions {
  enableOffline?: boolean;
  retryCount?: number;
  syncOnReconnect?: boolean;
}

export class FormManager<T> {
  private schema: z.ZodObject<any>;
  private validationOptions: FormValidationOptions;
  private offlineOptions: OfflineOptions;
  private errors: Record<string, string> = {};
  private pendingOperations: Array<() => Promise<void>> = [];

  constructor(
    schema: z.ZodObject<any>,
    validationOptions: FormValidationOptions = {},
    offlineOptions: OfflineOptions = {}
  ) {
    this.schema = schema;
    this.validationOptions = {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300,
      ...validationOptions
    };
    this.offlineOptions = {
      enableOffline: true,
      retryCount: 3,
      syncOnReconnect: true,
      ...offlineOptions
    };
  }

  validate(data: Partial<T>): { isValid: boolean; errors: Record<string, string> } {
    try {
      this.schema.parse(data);
      this.errors = {};
      return { isValid: true, errors: {} };
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.errors = error.errors.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>);
      }
      return { isValid: false, errors: this.errors };
    }
  }

  validateField(fieldName: string, value: any): string | null {
    try {
      const fieldSchema = (this.schema as any).shape[fieldName];
      if (fieldSchema) {
        fieldSchema.parse(value);
        delete this.errors[fieldName];
        return null;
      }
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || 'Erro de validação';
        this.errors[fieldName] = errorMessage;
        return errorMessage;
      }
      return 'Erro de validação';
    }
  }

  async submitWithRetry<R>(
    submitFn: (data: T) => Promise<R>,
    data: T
  ): Promise<R> {
    const validation = this.validate(data);
    if (!validation.isValid) {
      throw new Error('Dados do formulário inválidos');
    }

    if (!navigator.onLine && this.offlineOptions.enableOffline) {
      return this.handleOfflineSubmission(submitFn, data);
    }

    return retryOperation(
      () => submitFn(data),
      this.offlineOptions.retryCount
    );
  }

  private async handleOfflineSubmission<R>(
    submitFn: (data: T) => Promise<R>,
    data: T
  ): Promise<R> {
    // Store operation for later sync
    const operation = () => submitFn(data).then(() => {});
    this.pendingOperations.push(operation);
    
    // Show offline message
    showErrorToast('Operação guardada. Será sincronizada quando voltar online.');
    
    // Return a mock successful response
    return {} as R;
  }

  async syncPendingOperations(): Promise<void> {
    if (!navigator.onLine || this.pendingOperations.length === 0) {
      return;
    }

    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const operation of operations) {
      try {
        await operation();
      } catch (error) {
        // Re-add failed operations to pending queue
        this.pendingOperations.push(operation);
        showErrorToast('Erro ao sincronizar operação pendente');
      }
    }
  }

  getErrors(): Record<string, string> {
    return { ...this.errors };
  }

  clearErrors(): void {
    this.errors = {};
  }

  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }
}

// Enhanced validation schemas with better error messages
export const enhancedEmailSchema = z.string()
  .min(1, "Email é obrigatório")
  .email("Formato de email inválido")
  .max(255, "Email demasiado longo");

export const enhancedPhoneSchema = z.string()
  .min(1, "Telefone é obrigatório")
  .regex(/^[+]?[\d\s()-]{9,15}$/, "Formato de telefone inválido (9-15 dígitos)")
  .transform(value => value.replace(/\s+/g, ' ').trim());

export const enhancedPasswordSchema = z.string()
  .min(8, "Password deve ter pelo menos 8 caracteres")
  .max(128, "Password demasiado longa")
  .regex(/[a-z]/, "Password deve conter pelo menos uma letra minúscula")
  .regex(/[A-Z]/, "Password deve conter pelo menos uma letra maiúscula")
  .regex(/\d/, "Password deve conter pelo menos um número")
  .refine(val => !/\s/.test(val), "Password não pode conter espaços");

export const enhancedNIFSchema = z.string()
  .min(9, "NIF deve ter 9 dígitos")
  .max(9, "NIF deve ter 9 dígitos")
  .regex(/^\d{9}$/, "NIF deve conter apenas números")
  .refine(val => {
    // Basic NIF validation algorithm for PT
    const digits = val.split('').map(Number);
    const checkDigit = digits[8];
    const sum = digits.slice(0, 8).reduce((acc, digit, index) => acc + digit * (9 - index), 0);
    const remainder = sum % 11;
    const expected = remainder < 2 ? 0 : 11 - remainder;
    return checkDigit === expected;
  }, "NIF inválido");

// File validation utilities
export const createFileValidator = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) => {
  return z.custom<File | FileList>((data) => {
    if (!data) {
      return !options.required;
    }

    const files = data instanceof FileList ? Array.from(data) : [data];
    
    for (const file of files) {
      if (options.maxSize && file.size > options.maxSize) {
        throw new Error(`Ficheiro "${file.name}" é demasiado grande. Máximo: ${Math.round(options.maxSize / 1024 / 1024)}MB`);
      }
      
      if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
        throw new Error(`Tipo de ficheiro "${file.type}" não permitido para "${file.name}"`);
      }
    }
    
    return true;
  });
};

// Network status utilities for form management
export const createNetworkAwareForm = <T>(
  schema: z.ZodObject<any>,
  options: FormValidationOptions & OfflineOptions = {}
) => {
  const formManager = new FormManager<T>(schema, options, options);

  // Set up online/offline event listeners
  window.addEventListener('online', () => {
    formManager.syncPendingOperations();
  });

  return formManager;
};