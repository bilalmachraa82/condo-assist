
import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ERROR_MESSAGES } from '@/utils/constants';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Ocorreu um erro',
  message = ERROR_MESSAGES.generic,
  onRetry,
  retryText = 'Tentar Novamente',
  className
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {retryText}
        </Button>
      )}
    </div>
  );
};

export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorState
      title="Problema de ligação"
      message={ERROR_MESSAGES.network}
      onRetry={onRetry}
      retryText="Tentar Novamente"
    />
  );
};

export const NotFoundError: React.FC<{ resource?: string }> = ({ resource = 'página' }) => {
  return (
    <ErrorState
      title="Não encontrado"
      message={`A ${resource} solicitada não foi encontrada.`}
    />
  );
};

export const UnauthorizedError: React.FC = () => {
  return (
    <ErrorState
      title="Acesso negado"
      message={ERROR_MESSAGES.unauthorized}
    />
  );
};

interface ErrorAlertProps {
  error: string | Error | null;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex justify-between items-center">
        <span>{errorMessage}</span>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dispensar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export const OfflineIndicator: React.FC = () => {
  return (
    <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm">
      <WifiOff className="inline h-4 w-4 mr-2" />
      Sem ligação à internet
    </div>
  );
};
