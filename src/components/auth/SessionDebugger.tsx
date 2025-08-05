import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, User, Database } from "lucide-react";

export function SessionDebugger() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkSession = async () => {
    setLoading(true);
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Test database query
      const { data: assistances, error: dbError } = await supabase
        .from('assistances')
        .select('id, title')
        .limit(5);

      // Test auth.uid() function via a simple query that uses auth.uid()
      const { data: authTest, error: authError } = await supabase
        .from('user_roles')
        .select('role')
        .limit(1);

      setDebugInfo({
        session: session ? {
          user_id: session.user.id,
          expires_at: session.expires_at,
          access_token_length: session.access_token?.length || 0,
        } : null,
        sessionError,
        assistances: assistances || [],
        dbError,
        authTest,
        authError,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Debug error:", error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (!debugInfo) return null;

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Debug da Sessão
          <Button
            variant="outline"
            size="sm"
            onClick={checkSession}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Badge variant={debugInfo.session ? "default" : "destructive"}>
            Sessão: {debugInfo.session ? "Ativa" : "Inativa"}
          </Badge>
          {debugInfo.session && (
            <div className="mt-2 text-sm text-muted-foreground">
              <p>User ID: {debugInfo.session.user_id}</p>
              <p>Token length: {debugInfo.session.access_token_length}</p>
              <p>Expires at: {new Date(debugInfo.session.expires_at * 1000).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div>
          <Badge variant={debugInfo.dbError ? "destructive" : "default"}>
            Database: {debugInfo.dbError ? "Erro" : "OK"}
          </Badge>
          {debugInfo.dbError && (
            <p className="mt-2 text-sm text-red-600">{debugInfo.dbError.message}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Assistências encontradas: {debugInfo.assistances?.length || 0}
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          Última verificação: {debugInfo.timestamp}
        </div>
      </CardContent>
    </Card>
  );
}