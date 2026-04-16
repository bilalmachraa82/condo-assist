import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { ASSEMBLY_CATEGORIES } from "@/utils/assemblyCategories";
import { useBuildings } from "@/hooks/useBuildings";
import type { AssemblyFilters as Filters } from "@/hooks/useAssemblyItems";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  categoryCounts?: Record<string, number>;
}

const STATUS_CHIPS = [
  { value: "pending", label: "📋 Pendentes", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  { value: "in_progress", label: "🔧 Em Curso", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  { value: "done", label: "✅ Resolvidos", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
];

export default function AssemblyFilters({ filters, onChange, categoryCounts }: Props) {
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const { data: buildings } = useBuildings();

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filters, search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const hasFilters = filters.search || filters.status || filters.category || filters.building_id || filters.year;

  const toggleStatus = (value: string) => {
    onChange({ ...filters, status: filters.status === value ? undefined : value });
  };

  const toggleCategory = (value: string) => {
    onChange({ ...filters, category: filters.category === value ? undefined : value });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar assuntos..."
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

        <Select
          value={filters.year?.toString() || "all"}
          onValueChange={(v) => onChange({ ...filters, year: v === "all" ? undefined : parseInt(v) })}
        >
          <SelectTrigger className="w-full sm:w-[120px]">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
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

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => toggleStatus(chip.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filters.status === chip.value ? chip.color : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Category chips */}
      {categoryCounts && Object.keys(categoryCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ASSEMBLY_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.value] || 0;
            if (count === 0) return null;
            const isActive = filters.category === cat.value;
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive ? `${cat.bgClass} ${cat.textClass}` : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
