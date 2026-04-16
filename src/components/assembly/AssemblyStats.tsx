import { Card, CardContent } from "@/components/ui/card";
import { Clock, Wrench, CheckCircle2, Ban } from "lucide-react";

interface Props {
  statusCounts: Record<string, number>;
  total: number;
}

export default function AssemblyStats({ statusCounts, total }: Props) {
  const stats = [
    { label: "Pendentes", value: statusCounts.pending || 0, icon: Clock, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
    { label: "Em Curso", value: statusCounts.in_progress || 0, icon: Wrench, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
    { label: "Resolvidos", value: statusCounts.done || 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "Total", value: total, icon: Ban, color: "text-muted-foreground", bg: "bg-muted/50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className={s.bg}>
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`h-8 w-8 ${s.color}`} />
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
