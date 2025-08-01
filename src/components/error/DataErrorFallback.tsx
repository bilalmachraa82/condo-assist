import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface DataErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export const DataErrorFallback = ({ 
  error, 
  onRetry, 
  title = "Erro ao carregar dados",
  description = "Não foi possível carregar os dados. Verifique sua conexão e tente novamente."
}: DataErrorFallbackProps) => {
  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-4 text-xs text-muted-foreground bg-muted p-3 rounded">
            <p className="font-mono break-all">{error.message}</p>
          </div>
        )}
        {onRetry && (
          <div className="flex justify-center">
            <Button onClick={onRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const EmptyStateFallback = ({ 
  title = "Nenhum item encontrado",
  description = "Não há dados para exibir no momento.",
  action
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) => {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </CardContent>
    </Card>
  );
};