import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, AlertTriangle } from "lucide-react";
import { getAssemblyCategoryConfig } from "@/utils/assemblyCategories";
import { isUrgent } from "@/utils/assemblyParser";
import type { AssemblyItem } from "@/hooks/useAssemblyItems";

interface Props {
  item: AssemblyItem;
  onClick: (item: AssemblyItem) => void;
  onStatusChange: (id: string, status: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300" },
  in_progress: { label: "Em Curso", color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300" },
  done: { label: "Resolvido", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300" },
};

export default function AssemblyCard({ item, onClick, onStatusChange }: Props) {
  const cat = item.category ? getAssemblyCategoryConfig(item.category) : null;
  const CatIcon = cat?.icon;
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const urgent = isUrgent(item.description);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => onClick(item)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          {cat && CatIcon && (
            <div className={`flex-shrink-0 p-2.5 rounded-full ${cat.bgCircleClass}`}>
              <CatIcon className={`h-6 w-6 ${cat.textClass}`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">
                Cond. {item.building_code}
                {item.building_address && ` — ${item.building_address}`}
              </span>
              {urgent && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
            </div>
            <p className="text-sm mt-1 line-clamp-2">{item.description}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`text-[11px] border ${statusCfg.color}`}>{statusCfg.label}</Badge>
          {cat && (
            <Badge variant="secondary" className={`text-[11px] ${cat.bgClass} ${cat.textClass} border-0`}>
              {cat.label}
            </Badge>
          )}
          {item.estimated_cost && (
            <Badge variant="outline" className="text-[11px]">
              {item.estimated_cost.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
            </Badge>
          )}
        </div>

        {/* Status notes */}
        {item.status_notes && (
          <p className="text-xs text-muted-foreground italic line-clamp-1">{item.status_notes}</p>
        )}

        {/* Quick status change */}
        <div onClick={(e) => e.stopPropagation()}>
          <Select value={item.status} onValueChange={(v) => onStatusChange(item.id, v)}>
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Curso</SelectItem>
              <SelectItem value="done">Resolvido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
