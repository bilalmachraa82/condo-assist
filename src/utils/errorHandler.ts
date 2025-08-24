import { toast } from "@/components/ui/sonner"

export const showErrorToast = (message: string) => {
  console.error('Erro:', message);
  toast.error(message);
};

export const showSuccessToast = (message: string) => {
  console.log('Sucesso:', message);
  toast.success(message);
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`Tentativa ${attempt} falhou:`, error);
      
      if (attempt === maxRetries) {
        showErrorToast(`Falha após ${maxRetries} tentativas: ${lastError.message}`);
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
};

// Utility functions for common error handling scenarios
export const handleNetworkError = (error: any) => {
  if (!navigator.onLine) {
    showErrorToast('Sem ligação à internet. Verifique a sua ligação.');
  } else if (error.message?.includes('fetch')) {
    showErrorToast('Erro de ligação. Tente novamente.');
  } else {
    showErrorToast('Ocorreu um erro inesperado.');
  }
};

export const handleValidationError = (error: any) => {
  if (error.message?.includes('validation')) {
    showErrorToast('Dados inválidos. Verifique os campos preenchidos.');
  } else {
    showErrorToast('Erro de validação dos dados.');
  }
};

export const handleAuthError = (error: any) => {
  if (error.message?.includes('unauthorized') || error.message?.includes('401')) {
    showErrorToast('Sessão expirada. Faça login novamente.');
  } else if (error.message?.includes('forbidden') || error.message?.includes('403')) {
    showErrorToast('Não tem permissão para realizar esta ação.');
  } else {
    showErrorToast('Erro de autenticação.');
  }
};
