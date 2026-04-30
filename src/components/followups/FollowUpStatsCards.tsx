import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertTriangle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  pending?: number;
  sent?: number;
  failed?: number;
  overdue?: number;
  due_now?: number;
}

interface Props {
  stats?: Stats;
  activeStatus: string;
  onSelectStatus: (status: string) => void;
}

export default function FollowUpStatsCards({ stats, activeStatus, onSelectStatus }: Props) {
  const cards = [
    {
      key: "pending",
      label: "Pendentes",
      value: stats?.pending ?? 0,
      icon: Clock,
      color: "text-yellow-600",
      hint:
        (stats?.overdue ?? 0) > 0
          ? `${stats?.overdue} em atraso`
          : "Aguardam envio",
      hintTone: (stats?.overdue ?? 0) > 0 ? "danger" : "muted",
    },
    {
      key: "due_now_pending",
      // "Devidos agora" é um sub-conjunto de pendentes -> também aplica filtro pending
      label: "Devidos agora",
      value: stats?.due_now ?? 0,
      icon: Bell,
      color: "text-orange-600",
      hint: "Vão sair no próximo ciclo",
      hintTone: "muted" as const,
      filterStatus: "pending",
    },
    {
      key: "sent",
      label: "Enviados",
      value: stats?.sent ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      hint: "Histórico de envios",
      hintTone: "muted" as const,
    },
    {
      key: "failed",
      label: "Falhados",
      value: stats?.failed ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      hint: "Requerem atenção",
      hintTone: stats?.failed ? "danger" : ("muted" as const),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const filterStatus = (c as any).filterStatus ?? c.key;
        const isActive = activeStatus === filterStatus && c.key !== "due_now_pending";
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelectStatus(filterStatus)}
            className={cn(
              "text-left transition-all rounded-lg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            )}
          >
            <Card
              className={cn(
                "h-full transition-all",
                isActive
                  ? "ring-2 ring-primary shadow-md"
                  : "hover:shadow-sm hover:border-primary/30"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
                <Icon className={cn("h-4 w-4", c.color)} />
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", c.color)}>{c.value}</div>
                <div className="flex items-center gap-2 mt-1">
                  {c.hintTone === "danger" ? (
                    <Badge
                      variant="outline"
                      className="border-red-500/30 bg-red-500/10 text-red-600 text-[10px] px-1.5 py-0"
                    >
                      {c.hint}
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">{c.hint}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
