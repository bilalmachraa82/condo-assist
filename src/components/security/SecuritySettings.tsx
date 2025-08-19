
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Shield, Clock, AlertTriangle, Save } from "lucide-react";

interface SecuritySetting {
  key: string;
  value: any;
  description: string;
  category: string;
}

export default function SecuritySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, any>>({});

  const { data: securitySettings, isLoading } = useQuery({
    queryKey: ["security-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("category", "security")
        .order("key");

      if (error) throw error;
      
      const settingsMap: Record<string, any> = {};
      data.forEach((setting: SecuritySetting) => {
        settingsMap[setting.key] = setting.value;
      });
      
      setSettings(settingsMap);
      return data as SecuritySetting[];
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          key,
          value,
          category: "security",
          description: getSettingDescription(key)
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-settings"] });
      toast({
        title: "Definição atualizada",
        description: "A definição de segurança foi atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar a definição de segurança.",
        variant: "destructive",
      });
    },
  });

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      magic_code_valid_days: "Número de dias que um código mágico permanece válido",
      max_login_attempts: "Número máximo de tentativas de login antes de bloquear",
      session_timeout_hours: "Horas de inatividade antes de expirar sessão",
      require_2fa: "Requer autenticação de dois fatores",
      audit_retention_days: "Dias para manter logs de auditoria"
    };
    return descriptions[key] || "Definição de segurança";
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (key: string) => {
    updateSetting.mutate({ key, value: settings[key] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Definições de Segurança
        </CardTitle>
        <CardDescription>
          Configure as políticas de segurança do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Magic Code Validity */}
        <div className="space-y-2">
          <Label htmlFor="magic_code_valid_days" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Validade dos Códigos Mágicos (dias)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="magic_code_valid_days"
              type="number"
              min="1"
              max="365"
              value={settings.magic_code_valid_days || 30}
              onChange={(e) => handleSettingChange('magic_code_valid_days', parseInt(e.target.value))}
              className="w-24"
            />
            <Button
              size="sm"
              onClick={() => handleSave('magic_code_valid_days')}
              disabled={updateSetting.isPending}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Controla por quanto tempo os códigos mágicos dos fornecedores permanecem válidos
          </p>
        </div>

        {/* Max Login Attempts */}
        <div className="space-y-2">
          <Label htmlFor="max_login_attempts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Máximo de Tentativas de Login
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="max_login_attempts"
              type="number"
              min="3"
              max="10"
              value={settings.max_login_attempts || 5}
              onChange={(e) => handleSettingChange('max_login_attempts', parseInt(e.target.value))}
              className="w-24"
            />
            <Button
              size="sm"
              onClick={() => handleSave('max_login_attempts')}
              disabled={updateSetting.isPending}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Número máximo de tentativas de login antes de bloquear temporariamente
          </p>
        </div>

        {/* Session Timeout */}
        <div className="space-y-2">
          <Label htmlFor="session_timeout_hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeout de Sessão (horas)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="session_timeout_hours"
              type="number"
              min="1"
              max="24"
              value={settings.session_timeout_hours || 8}
              onChange={(e) => handleSettingChange('session_timeout_hours', parseInt(e.target.value))}
              className="w-24"
            />
            <Button
              size="sm"
              onClick={() => handleSave('session_timeout_hours')}
              disabled={updateSetting.isPending}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Horas de inatividade antes de expirar a sessão do utilizador
          </p>
        </div>

        {/* Audit Retention */}
        <div className="space-y-2">
          <Label htmlFor="audit_retention_days" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Retenção de Logs (dias)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="audit_retention_days"
              type="number"
              min="30"
              max="365"
              value={settings.audit_retention_days || 90}
              onChange={(e) => handleSettingChange('audit_retention_days', parseInt(e.target.value))}
              className="w-24"
            />
            <Button
              size="sm"
              onClick={() => handleSave('audit_retention_days')}
              disabled={updateSetting.isPending}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Por quanto tempo manter os logs de auditoria antes de arquivar
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
