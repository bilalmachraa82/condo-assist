import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { KNOWLEDGE_CATEGORIES } from "@/utils/knowledgeCategories";
import { useBuildings } from "@/hooks/useBuildings";
import type { KnowledgeFilters as Filters } from "@/hooks/useKnowledgeArticles";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function KnowledgeFilters({ filters, onChange }: Props) {
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const { data: buildings } = useBuildings();

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filters, search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const hasFilters = filters.search || filters.category || filters.building_id;

  return (
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
        value={filters.category || "all"}
        onValueChange={(v) => onChange({ ...filters, category: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {KNOWLEDGE_CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
  );
}
