import { Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  hasFilters: boolean;
  onClearFilters?: () => void;
  emptyTitle?: string;
  emptyHint?: string;
  filteredTitle?: string;
}

export default function FollowUpEmptyState({
  hasFilters,
  onClearFilters,
  emptyTitle = "Tudo em dia",
  emptyHint = "Não há follow-ups pendentes neste momento.",
  filteredTitle = "Sem resultados para os filtros aplicados.",
}: Props) {
  if (hasFilters) {
    return (
      <div className="text-center py-10">
        <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground mb-3">{filteredTitle}</p>
        {onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-10">
      <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-600" />
      <p className="font-medium">{emptyTitle}</p>
      <p className="text-sm text-muted-foreground mt-1">{emptyHint}</p>
    </div>
  );
}
