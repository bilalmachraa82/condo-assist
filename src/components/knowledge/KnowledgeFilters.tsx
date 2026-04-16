import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import { KNOWLEDGE_CATEGORIES } from "@/utils/knowledgeCategories";
import { useBuildings } from "@/hooks/useBuildings";
import type { KnowledgeFilters as Filters } from "@/hooks/useKnowledgeArticles";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  categoryCounts?: Record<string, number>;
}

export default function KnowledgeFilters({ filters, onChange, categoryCounts }: Props) {
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const { data: buildings } = useBuildings();

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filters, search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const hasFilters = filters.search || filters.category || filters.building_id;

  const toggleCategory = (value: string) => {
    onChange({
      ...filters,
      category: filters.category === value ? undefined : value,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar artigos..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.building_id || "all"}
          onValueChange={(v) => onChange({ ...filters, building_id: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Edifício" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os edifícios</SelectItem>
            {buildings?.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.code} - {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSearchInput("");
              onChange({});
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Category chips */}
      {categoryCounts && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {KNOWLEDGE_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.value] || 0;
              if (count === 0) return null;
              const isActive = filters.category === cat.value;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? `${cat.bgClass} ${cat.textClass}`
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? "bg-background/30" : "bg-background"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
