
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Shield, Download } from "lucide-react";
import { format } from "date-fns";
import { useSecurityEvents, useSecurityMetrics } from "@/hooks/useSecurityEvents";

export default function SecurityAudit() {
  const { data: securityEvents, isLoading: eventsLoading } = useSecurityEvents(100);
  const { data: metrics, isLoading: metricsLoading } = useSecurityMetrics();

  const getEventVariant = (action: string) => {
    switch (action) {
      case "magic_code_invalid":
      case "login_failed":
      case "supplier_access_attempt":
        return "destructive";
      case "magic_code_expired":
        return "secondary";
      case "magic_code_validation":
        return "default";
      default:
        return "outline";
    }
  };

  const exportAuditLog = async () => {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error || !data) return;

    const csv = [
      "Data,Ação,Detalhes,Utilizador,Fornecedor,Assistência",
      ...data.map(event => [
        format(new Date(event.created_at), 'yyyy-MM-dd HH:mm:ss'),
        event.action,
        event.details || '',
        event.user_id || '',
        event.supplier_id || '',
        event.assistance_id || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (eventsLoading || metricsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 w-40 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Logins Falhados (24h)</span>
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.failedLogins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Códigos Ativos</span>
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.activeCodes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Códigos Expirados</span>
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.expiredCodes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Atividades Suspeitas (24h)</span>
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.suspiciousActivities}</div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Log de Auditoria de Segurança
              </CardTitle>
              <CardDescription>
                Eventos de segurança recentes do sistema
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportAuditLog}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {securityEvents && securityEvents.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant={getEventVariant(event.action) as any}>
                      {event.action}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                  {event.metadata && (
                    <div className="text-xs text-muted-foreground">
                      {event.supplier_id && (
                        <span>Fornecedor: {event.supplier_id.slice(0, 8)}...</span>
                      )}
                      {event.assistance_id && (
                        <span>Assistência: {event.assistance_id.slice(0, 8)}...</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
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
