import { toast } from "@/components/ui/sonner"

export const extractErrorMessage = (e: unknown): string => {
  if (e == null) return "Ocorreu um erro inesperado.";
  if (typeof e === "string") return e;
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "object") {
    const anyE = e as any;
    const candidate =
      (typeof anyE.message === "string" && anyE.message.trim()) ||
      (typeof anyE.error_description === "string" && anyE.error_description.trim()) ||
      (typeof anyE.error === "string" && anyE.error.trim()) ||
      (typeof anyE.details === "string" && anyE.details.trim()) ||
      (typeof anyE.hint === "string" && anyE.hint.trim()) ||
      (typeof anyE.code === "string" && anyE.code.trim());
    if (candidate) return candidate as string;
    try {
      const json = JSON.stringify(e);
      if (json && json !== "{}") return json;
    } catch {}
  }
  return "Ocorreu um erro inesperado.";
};

export const showErrorToast = (message: unknown) => {
  const msg = typeof message === "string" ? message : extractErrorMessage(message);
  console.error('Erro:', msg);
  toast.error(msg);
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
