import { toast } from '@/hooks/use-toast';

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
}

export const createAppError = (
  message: string, 
  code?: string, 
  statusCode?: number,
  context?: Record<string, any>
): AppError => {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusCode;
  error.context = context;
  return error;
};

export const handleApiError = (error: any): AppError => {
  // Handle Supabase errors
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        return createAppError('Dados não encontrados', 'NOT_FOUND', 404);
      case '23505':
        return createAppError('Este registo já existe', 'DUPLICATE', 409);
      case '23503':
        return createAppError('Não é possível eliminar: existem dependências', 'DEPENDENCY', 409);
      case '42501':
        return createAppError('Não tem permissão para esta operação', 'FORBIDDEN', 403);
      default:
        return createAppError(error.message || 'Erro interno do servidor', error.code, 500);
    }
  }

  // Handle network errors
  if (error?.name === 'NetworkError' || !navigator.onLine) {
    return createAppError('Sem conexão à internet', 'NETWORK_ERROR', 0);
  }

  // Handle fetch errors
  if (error?.status) {
    switch (error.status) {
      case 400:
        return createAppError('Dados inválidos', 'BAD_REQUEST', 400);
      case 401:
        return createAppError('Sessão expirada. Por favor, faça login novamente', 'UNAUTHORIZED', 401);
      case 403:
        return createAppError('Acesso negado', 'FORBIDDEN', 403);
      case 404:
        return createAppError('Recurso não encontrado', 'NOT_FOUND', 404);
      case 429:
        return createAppError('Muitas tentativas. Tente novamente mais tarde', 'RATE_LIMITED', 429);
      case 500:
        return createAppError('Erro interno do servidor', 'SERVER_ERROR', 500);
      default:
        return createAppError('Erro inesperado', 'UNKNOWN', error.status);
    }
  }

  // Default error
  return createAppError(
    error?.message || 'Ocorreu um erro inesperado', 
    'UNKNOWN', 
    500,
    { originalError: error }
  );
};

export const showErrorToast = (error: AppError | Error | string) => {
  const appError = typeof error === 'string' 
    ? createAppError(error) 
    : error instanceof Error 
      ? handleApiError(error)
      : error;

  toast({
    variant: "destructive",
    title: "Erro",
    description: appError.message,
  });

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('App Error:', appError);
  }
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw handleApiError(error);
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }

  throw handleApiError(lastError);
};