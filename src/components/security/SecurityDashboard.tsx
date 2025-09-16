
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, Clock, Users, Key } from "lucide-react";
import { format } from "date-fns";
import SecurityMonitor from "./SecurityMonitor";

interface SecurityEvent {
  id: string;
  action: string;
  details: string;
  metadata: any;
  created_at: string;
}

interface SecurityStats {
  activeUsers: number;
  activeMagicCodes: number;
  expiredCodes: number;
  recentSecurityEvents: number;
}

export default function SecurityDashboard() {
  const { data: securityEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["security-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("action", "security_event")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SecurityEvent[];
    },
  });

  const { data: securityStats, isLoading: statsLoading } = useQuery({
    queryKey: ["security-stats"],
    queryFn: async () => {
      // Get active magic codes count
      const { count: activeCodes } = await supabase
        .from("supplier_magic_codes")
        .select("*", { count: "exact", head: true })
        .gt("expires_at", new Date().toISOString());

      // Get expired codes count
      const { count: expiredCodes } = await supabase
        .from("supplier_magic_codes")
        .select("*", { count: "exact", head: true })
        .lt("expires_at", new Date().toISOString());

      // Get recent security events count (last 24h)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: recentEvents } = await supabase
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .eq("action", "security_event")
        .gte("created_at", yesterday.toISOString());

      // Get active users count (users with profiles)
      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      return {
        activeUsers: activeUsers || 0,
        activeMagicCodes: activeCodes || 0,
        expiredCodes: expiredCodes || 0,
        recentSecurityEvents: recentEvents || 0,
      } as SecurityStats;
    },
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'magic_code_validation':
        return <Key className="h-4 w-4" />;
      case 'magic_code_invalid':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'magic_code_expired':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getEventSeverity = (eventType: string) => {
    switch (eventType) {
      case 'magic_code_invalid':
      case 'supplier_inactive':
        return 'destructive';
      case 'magic_code_expired':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (eventsLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Painel de Segurança</h2>
      </div>

      {/* Security Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilizadores Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats?.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Utilizadores com perfis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Códigos Ativos</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats?.activeMagicCodes}</div>
            <p className="text-xs text-muted-foreground">
              Códigos mágicos válidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Códigos Expirados</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats?.expiredCodes}</div>
            <p className="text-xs text-muted-foreground">
              Códigos que expiraram
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Recentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats?.recentSecurityEvents}</div>
            <p className="text-xs text-muted-foreground">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New Security Monitor Component */}
      <SecurityMonitor />

      {/* Legacy Security Events Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Eventos do Sistema Legado
          </CardTitle>
          <CardDescription>
            Eventos de segurança do log de atividades anterior
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityEvents && securityEvents.length > 0 ? (
            <div className="space-y-4">
              {securityEvents.map((event) => {
                const metadata = event.metadata || {};
                const eventType = metadata.event_type || 'unknown';
                
                return (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getEventIcon(eventType)}
                      <div>
                        <p className="font-medium">{event.details}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getEventSeverity(eventType) as any}>
                            {eventType}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {metadata.supplier_id && (
                      <Badge variant="outline">
                        Fornecedor: {metadata.supplier_id.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum evento de segurança registado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
