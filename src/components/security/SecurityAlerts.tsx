import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Shield, Clock, Users } from "lucide-react";
import { secureLogger } from "@/utils/secureLogger";

interface SecurityAlert {
  id: string;
  event_type: string;
  severity: string;
  details: any;
  created_at: string;
  user_id?: string;
  ip_address?: string;
}

export default function SecurityAlerts() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .in('severity', ['high', 'critical'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        secureLogger.error("Failed to fetch security alerts", { error: error.message });
        throw error;
      }

      return data as SecurityAlert[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'default';
    }
  };

  const getAlertIcon = (eventType: string) => {
    if (eventType.includes('brute_force') || eventType.includes('invalid')) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (eventType.includes('suspicious')) {
      return <Users className="h-4 w-4" />;
    }
    if (eventType.includes('expired')) {
      return <Clock className="h-4 w-4" />;
    }
    return <Shield className="h-4 w-4" />;
  };

  const getAlertTitle = (eventType: string) => {
    switch (eventType) {
      case 'magic_code_brute_force_blocked':
        return 'Brute Force Attack Blocked';
      case 'suspicious_ip_detected':
        return 'Suspicious IP Activity';
      case 'invalid_magic_code_attempt':
        return 'Invalid Access Attempt';
      case 'inactive_supplier_access_attempt':
        return 'Inactive Supplier Access';
      case 'role_changed':
        return 'User Role Modified';
      case 'excessive_magic_code_usage':
        return 'Excessive Code Usage';
      default:
        return 'Security Event';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <h3 className="text-lg font-medium">Security Alerts</h3>
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-medium">Security Alerts</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          No critical security alerts at this time.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-medium">Security Alerts</h3>
        </div>
        <Badge variant="destructive">{alerts.length}</Badge>
      </div>
      
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Alert key={alert.id} variant="destructive">
            <div className="flex items-start space-x-3">
              {getAlertIcon(alert.event_type)}
              <div className="flex-1 min-w-0">
                <AlertTitle className="text-sm font-medium">
                  {getAlertTitle(alert.event_type)}
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-1">
                  {alert.ip_address && (
                    <span className="block">IP: {alert.ip_address}</span>
                  )}
                  <span className="block">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                  {alert.details?.failure_count && (
                    <span className="block">
                      Attempts: {alert.details.failure_count}
                    </span>
                  )}
                </AlertDescription>
              </div>
              <Badge variant={getSeverityColor(alert.severity) as any} className="text-xs">
                {alert.severity}
              </Badge>
            </div>
          </Alert>
        ))}
      </div>
    </Card>
  );
}