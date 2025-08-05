import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export function AuthStatusIndicator() {
  const { user, isAuthenticated, authError, loading, refreshSession } = useAuth();

  // Don't show anything if loading or authenticated without errors
  if (loading || (isAuthenticated && !authError)) {
    return null;
  }

  // Show authentication error
  if (authError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{authError}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshSession}
            className="ml-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Tentar Novamente
          </Button>
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