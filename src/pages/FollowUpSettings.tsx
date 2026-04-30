import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, RotateCcw, Info, Clock, Mail, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAllAppSettings,
  useUpdateAppSetting,
} from "@/hooks/useAppSettings";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

type FieldDef = {
  key: string;
  label: string;
  unit: "horas" | "dias" | "tentativas";
  defaultValue: number;
  hint?: string;
  min?: number;
  max?: number;
};

type Flow = "assistencias" | "pendencias";

type SectionDef = {
  id: string;
  flow: Flow;
  title: string;
  description: string;
  icon: typeof Clock;
  fields: FieldDef[];
};

const SECTIONS: SectionDef[] = [
  {
    id: "quotation",
    title: "Lembretes de orçamento",
    description:
      "Quando o sistema pede uma orçamento ao fornecedor, agenda automaticamente lembretes em escalação. O 1º depende da prioridade da assistência.",
    icon: Wrench,
    fields: [
      {
        key: "quotation_first_critical_hours",
        label: "1º lembrete — prioridade Crítica",
        unit: "horas",
        defaultValue: 12,
        hint: "Horas após pedido de orçamento.",
      },
      {
        key: "quotation_first_urgent_hours",
        label: "1º lembrete — prioridade Urgente",
        unit: "horas",
        defaultValue: 24,
      },
      {
        key: "quotation_first_normal_hours",
        label: "1º lembrete — prioridade Normal",
        unit: "horas",
        defaultValue: 48,
      },
      {
        key: "quotation_second_attempt_hours",
        label: "2º lembrete (escalação)",
        unit: "horas",
        defaultValue: 24,
        hint: "Horas após o 1º lembrete sem resposta.",
      },
      {
        key: "quotation_third_attempt_hours",
        label: "3º lembrete",
        unit: "horas",
        defaultValue: 48,
      },
    ],
  },
  {
    id: "schedule",
    title: "Confirmação e execução do trabalho",
    description:
      "Lembretes automáticos relacionados com a marcação e a véspera/conclusão do trabalho.",
    icon: Clock,
    fields: [
      {
        key: "date_confirmation_hours",
        label: "Pedido de confirmação de data",
        unit: "horas",
        defaultValue: 24,
        hint: "Horas após o fornecedor aceitar a assistência.",
      },
      {
        key: "work_reminder_hours_before",
        label: "Lembrete de véspera",
        unit: "horas",
        defaultValue: 24,
        hint: "Horas antes da data agendada do trabalho.",
      },
      {
        key: "completion_reminder_hours_after",
        label: "Lembrete de conclusão",
        unit: "horas",
        defaultValue: 24,
        hint: "Horas após a data esperada de conclusão.",
      },
      {
        key: "retry_after_failure_hours",
        label: "Re-tentativa após falha de envio",
        unit: "horas",
        defaultValue: 4,
        hint: "Horas até nova tentativa quando o envio de email falha.",
      },
    ],
  },
  {
    id: "pendency",
    title: "Lembretes SLA de pendências email",
    description:
      "Quando uma pendência fica em 'Aguarda resposta', o sistema cria lembretes automáticos com esta cadência.",
    icon: Mail,
    fields: [
      {
        key: "pendency_sla_cadence_days",
        label: "Dias entre tentativas",
        unit: "dias",
        defaultValue: 2,
        min: 1,
        max: 30,
      },
      {
        key: "pendency_sla_max_attempts",
        label: "Número máximo de tentativas",
        unit: "tentativas",
        defaultValue: 3,
        min: 1,
        max: 10,
      },
    ],
  },
];

function parseSettingValue(raw: any, fallback: number): number {
  if (raw === null || raw === undefined) return fallback;
  const v = typeof raw === "string" ? raw.replace(/"/g, "") : raw;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

export default function FollowUpSettings() {
  const { data, isLoading } = useAllAppSettings();
  const updateMutation = useUpdateAppSetting();

  // Initial values from DB
  const initialValues = useMemo(() => {
    const out: Record<string, number> = {};
    const grouped = data?.grouped?.followups ?? {};
    SECTIONS.flatMap((s) => s.fields).forEach((f) => {
      out[f.key] = parseSettingValue(grouped[f.key], f.defaultValue);
    });
    return out;
  }, [data]);

  const [values, setValues] = useState<Record<string, number>>({});
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const dirtyKeys = useMemo(
    () => Object.keys(values).filter((k) => values[k] !== initialValues[k]),
    [values, initialValues]
  );

  const handleChange = (key: string, raw: string) => {
    const n = parseInt(raw, 10);
    setValues((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
  };

  const handleReset = (key: string, defaultValue: number) => {
    setValues((prev) => ({ ...prev, [key]: defaultValue }));
  };

  const handleSaveAll = async () => {
    if (dirtyKeys.length === 0) return;
    try {
      await Promise.all(
        dirtyKeys.map((key) =>
          updateMutation.mutateAsync({ key, value: values[key] })
        )
      );
      toast.success(`${dirtyKeys.length} configuração(ões) guardada(s)`, {
        description: "Os novos tempos vão aplicar-se a partir do próximo agendamento.",
      });
    } catch (e: any) {
      toast.error("Erro ao guardar", { description: e?.message });
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/follow-ups">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Configuração de tempos</h1>
              <p className="text-sm text-muted-foreground">
                Define quando o sistema dispara cada tipo de lembrete e follow-up.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dirtyKeys.length > 0 && (
              <Badge variant="secondary">{dirtyKeys.length} alteração(ões) por guardar</Badge>
            )}
            <Button
              onClick={handleSaveAll}
              disabled={dirtyKeys.length === 0 || updateMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? "A guardar..." : "Guardar tudo"}
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Os novos valores aplicam-se aos próximos lembretes criados. Lembretes
            já agendados mantêm a sua data original — para alterar individualmente,
            usa o botão "Reagendar" no dashboard de Follow-ups.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            A carregar configurações...
          </div>
        ) : (
          <div className="space-y-6">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {section.title}
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {section.fields.map((field, idx) => {
                      const current = values[field.key] ?? field.defaultValue;
                      const original = initialValues[field.key];
                      const isDirty = current !== original;
                      const isDefault = current === field.defaultValue;
                      return (
                        <div key={field.key}>
                          {idx > 0 && <Separator className="mb-4" />}
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                            <div className="space-y-1">
                              <Label htmlFor={field.key} className="flex items-center gap-2">
                                {field.label}
                                {isDirty && (
                                  <Badge variant="outline" className="text-[10px] py-0">
                                    Modificado
                                  </Badge>
                                )}
                              </Label>
                              {field.hint && (
                                <p className="text-xs text-muted-foreground">{field.hint}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                id={field.key}
                                type="number"
                                value={current}
                                onChange={(e) => handleChange(field.key, e.target.value)}
                                min={field.min ?? 0}
                                max={field.max ?? 999}
                                className="w-24"
                              />
                              <span className="text-sm text-muted-foreground w-20">
                                {field.unit}
                              </span>
                              {!isDefault && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleReset(field.key, field.defaultValue)}
                                  title={`Repor para ${field.defaultValue} ${field.unit}`}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
