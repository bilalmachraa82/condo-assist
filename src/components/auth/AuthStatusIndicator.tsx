import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export function AuthStatusIndicator() {
  const { user, isAuthenticated, authError, loading, refreshSession, forceReauth, validateSession } = useAuth();

  // Don't show anything if loading or authenticated without errors
  if (loading || (isAuthenticated && !authError)) {
    return null;
  }

  // Show authentication error
  if (authError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex flex-col gap-2">
            <span>{authError}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSession}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconectar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={forceReauth}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Login Completo
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show session validation warning for authenticated users
  if (isAuthenticated === false && user) {
    return (
      <Alert variant="destructive" className="mb-4 border-yellow-200 bg-yellow-50 text-yellow-800">
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <div className="flex flex-col gap-2">
            <span>Sessão não validada. Os dados podem não carregar corretamente.</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const isValid = await validateSession();
                  if (!isValid) {
                    await refreshSession();
                  }
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Validar Sessão
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={forceReauth}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Reautenticar
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show connection status for authenticated users
  if (isAuthenticated) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
          <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
          Conectado
        </Badge>
      </div>
    );
  }

  return null;
}