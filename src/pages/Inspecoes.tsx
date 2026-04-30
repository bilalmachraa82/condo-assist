import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInspectionStatus, useInspectionCategories, STATUS_META, InspectionStatus } from "@/hooks/useInspections";
import { InspectionForm } from "@/components/inspections/InspectionForm";
import { ShieldCheck, AlertTriangle, Clock, CalendarX, HelpCircle, Plus, Search, Hourglass, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_ORDER: InspectionStatus[] = ["overdue", "due_soon_15", "due_soon_30", "pending", "missing", "ok"];

export default function Inspecoes() {
  const { data: rows = [], isLoading } = useInspectionStatus();
  const { data: categories = [] } = useInspectionCategories();
  const [openForm, setOpenForm] = useState(false);
  const [presetBuilding, setPresetBuilding] = useState<string | undefined>();
  const [presetCategory, setPresetCategory] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const tableRef = useRef<HTMLDivElement | null>(null);

  const stats = useMemo(() => {
    const s = { ok: 0, due_soon_30: 0, due_soon_15: 0, overdue: 0, missing: 0, pending: 0 };
    rows.forEach(r => { s[r.status]++; });
    return s;
  }, [rows]);

  const coverage = useMemo(() => {
    const map = new Map<string, { id: string; label: string; color: string; total: number; covered: number }>();
    rows.forEach(r => {
      const cur = map.get(r.category_id) ?? { id: r.category_id, label: r.category_label, color: r.category_color, total: 0, covered: 0 };
      cur.total++;
      if (r.status !== "missing") cur.covered++;
      map.set(r.category_id, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const handleCategoryClick = (id: string) => {
    setCategoryFilter(prev => (prev === id ? "all" : id));
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => statusFilter === "all" || r.status === statusFilter)
      .filter(r => categoryFilter === "all" || r.category_id === categoryFilter)
      .filter(r => !q || `${r.building_code} ${r.building_name} ${r.category_label} ${r.company_name ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  }, [rows, search, statusFilter, categoryFilter]);

  const openFor = (buildingId?: string, categoryId?: string) => {
    setPresetBuilding(buildingId); setPresetCategory(categoryId); setOpenForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" /> Inspeções Periódicas
          </h1>
          <p className="text-muted-foreground mt-1">
            Compliance legal por edifício. Alertas automáticos por email para <strong>geral@luvimg.com</strong> a 30 e 15 dias do vencimento.
          </p>
        </div>
        <Button onClick={() => openFor()}><Plus className="h-4 w-4 mr-1" /> Registar inspeção</Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Em dia" value={stats.ok} icon={<ShieldCheck />} status="ok" onClick={() => setStatusFilter("ok")} />
        <KpiCard label="A vencer 30d" value={stats.due_soon_30} icon={<Clock />} status="due_soon_30" onClick={() => setStatusFilter("due_soon_30")} />
        <KpiCard label="A vencer 15d" value={stats.due_soon_15} icon={<Clock />} status="due_soon_15" onClick={() => setStatusFilter("due_soon_15")} />
        <KpiCard label="Vencidos" value={stats.overdue} icon={<CalendarX />} status="overdue" onClick={() => setStatusFilter("overdue")} />
        <KpiCard label="Pendentes" value={stats.pending} icon={<Hourglass />} status="pending" onClick={() => setStatusFilter("pending")} />
        <KpiCard label="Sem registo" value={stats.missing} icon={<HelpCircle />} status="missing" onClick={() => setStatusFilter("missing")} />
      </div>

      {/* Coverage per category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cobertura por categoria</CardTitle>
          <p className="text-xs text-muted-foreground">Edifícios com pelo menos um registo de inspeção</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {coverage.map(c => {
              const pct = c.total > 0 ? Math.round((c.covered / c.total) * 100) : 0;
              const active = categoryFilter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategoryClick(c.id)}
                  aria-pressed={active}
                  className={cn(
                    "text-left rounded-md border p-3 transition hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring",
                    active && "ring-2 ring-offset-1"
                  )}
                  style={active ? { boxShadow: `0 0 0 2px ${c.color}` } : undefined}
                  title={active ? "Clique para limpar filtro" : `Filtrar tabela por ${c.label}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.covered}/{c.total}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center justify-between">
                    <span>{pct}% cobertura</span>
                    {active && <span className="text-foreground font-medium inline-flex items-center gap-1"><X className="h-3 w-3" />limpar</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>


      <Card ref={tableRef as any}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Compliance por edifício e categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Pesquisar edifício, categoria, empresa..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
                <SelectItem value="due_soon_15">A vencer 15d</SelectItem>
                <SelectItem value="due_soon_30">A vencer 30d</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="missing">Sem registo</SelectItem>
                <SelectItem value="ok">Em dia</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Edifício</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Última inspeção</TableHead>
                  <TableHead>Próxima</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Acção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sem resultados.</TableCell></TableRow>
                )}
                {filtered.map(r => {
                  const meta = STATUS_META[r.status];
                  return (
                    <TableRow key={`${r.building_id}-${r.category_id}`}>
                      <TableCell className="font-medium">{r.building_code} - {r.building_name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.category_color }} />
                          {r.category_label}
                          <span className="text-xs text-muted-foreground">({r.validity_years}a)</span>
                        </span>
                      </TableCell>
                      <TableCell>{r.inspection_date ? format(parseISO(r.inspection_date), "dd/MM/yyyy") : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{r.next_due_date ? format(parseISO(r.next_due_date), "dd/MM/yyyy") : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(meta.bg, meta.color, meta.border)}>
                          {meta.label}
                          {r.days_until_due !== null && r.status !== "ok" && r.status !== "missing" && r.status !== "pending" && (
                            <span className="ml-1 opacity-80">· {r.days_until_due}d</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.company_name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openFor(r.building_id, r.category_id)}>
                          Registar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <InspectionForm open={openForm} onOpenChange={setOpenForm} defaultBuildingId={presetBuilding} defaultCategoryId={presetCategory} />
    </div>
  );
}

function KpiCard({ label, value, icon, status, onClick }: { label: string; value: number; icon: React.ReactNode; status: InspectionStatus; onClick?: () => void }) {
  const meta = STATUS_META[status];
  return (
    <button onClick={onClick} className={cn("text-left rounded-lg border p-4 transition hover:scale-[1.02] hover:shadow-md", meta.bg, meta.border)}>
      <div className={cn("flex items-center gap-2 text-xs font-medium uppercase tracking-wide", meta.color)}>
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span> {label}
      </div>
      <div className={cn("text-3xl font-bold mt-2", meta.color)}>{value}</div>
    </button>
  );
}
