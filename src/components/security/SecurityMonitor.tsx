import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Eye, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  details: any;
  created_at: string;
}

export default function SecurityMonitor() {
  const { data: securityEvents, isLoading } = useQuery({
    queryKey: ["security-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as SecurityEvent[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("login") || eventType.includes("logout")) {
      return <Shield className="h-4 w-4" />;
    }
    if (eventType.includes("invalid") || eventType.includes("failed")) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (eventType.includes("access")) {
      return <Eye className="h-4 w-4" />;
    }
    return <Activity className="h-4 w-4" />;
  };

  const getEventDescription = (event: SecurityEvent) => {
    const eventDescriptions: Record<string, string> = {
      user_login: "Utilizador fez login",
      user_logout: "Utilizador fez logout",
      token_refreshed: "Token de acesso renovado",
      magic_code_access_attempt: "Tentativa de acesso com código mágico",
      invalid_magic_code_attempt: "Tentativa de código mágico inválido",
      excessive_magic_code_usage: "Uso excessivo de código mágico",
      magic_code_auto_renewed: "Código mágico renovado automaticamente",
      expired_magic_code_grace_period: "Código expirado em período de graça",
      expired_magic_code_rejected: "Código expirado rejeitado",
      inactive_supplier_access_attempt: "Tentativa de acesso por fornecedor inativo",
      magic_code_access_success: "Acesso com código mágico bem-sucedido",
    };
    
    return eventDescriptions[event.event_type] || event.event_type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Monitor de Segurança
          </CardTitle>
          <CardDescription>
            A carregar eventos de segurança...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Monitor de Segurança
        </CardTitle>
        <CardDescription>
          Eventos de segurança em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {securityEvents?.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getEventIcon(event.event_type)}
                <div>
                  <p className="font-medium">{getEventDescription(event)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(event.created_at), {
                      addSuffix: true,
                      locale: pt,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getSeverityVariant(event.severity)}>
                  {event.severity}
                </Badge>
                {event.ip_address && (
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {event.ip_address}
                  </code>
                )}
              </div>
            </div>
          ))}
          
          {!securityEvents?.length && (
            <div className="text-center py-6 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum evento de segurança registado</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}