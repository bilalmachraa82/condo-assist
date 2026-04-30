import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, ShieldCheck, Clock, CalendarX, HelpCircle, Plus, Search, RefreshCw, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  COVERAGE_LABEL,
  INSURANCE_STATUS_META,
  InsuranceStatus,
  InsuranceStatusRow,
  useInsuranceStatus,
} from "@/hooks/useInsurances";
import { InsuranceForm } from "@/components/insurances/InsuranceForm";

const STATUS_ORDER: InsuranceStatus[] = ["overdue", "due_soon_30", "missing", "ok"];

export default function Seguros() {
  const { data: rows = [], isLoading } = useInsuranceStatus();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "renew" | "edit">("create");
  const [prefill, setPrefill] = useState<InsuranceStatusRow | undefined>();
  const [presetBuilding, setPresetBuilding] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [insurerFilter, setInsurerFilter] = useState<string>("all");

  const stats = useMemo(() => {
    const s = { ok: 0, due_soon_30: 0, overdue: 0, missing: 0 };
    rows.forEach(r => { s[r.status]++; });
    return s;
  }, [rows]);

  const insurers = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.insurer) set.add(r.insurer); });
    return Array.from(set).sort();
  }, [rows]);

  const coverage = useMemo(() => {
    const total = rows.length;
    const covered = rows.filter(r => r.status !== "missing").length;
    const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
    return { total, covered, pct };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => statusFilter === "all" || r.status === statusFilter)
      .filter(r => insurerFilter === "all" || r.insurer === insurerFilter)
      .filter(r => !q || `${r.building_code} ${r.building_name} ${r.insurer ?? ""} ${r.policy_number ?? ""} ${r.broker ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  }, [rows, search, statusFilter, insurerFilter]);

  const openCreate = (buildingId?: string) => {
    setMode("create"); setPrefill(undefined); setPresetBuilding(buildingId); setOpen(true);
  };
  const openRenew = (r: InsuranceStatusRow) => {
    setMode("renew"); setPrefill(r); setPresetBuilding(r.building_id); setOpen(true);
  };
  const openEdit = (r: InsuranceStatusRow) => {
    setMode("edit"); setPrefill(r); setPresetBuilding(r.building_id); setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-primary" /> Seguros de Condomínio
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão de apólices e renovações. Alertas automáticos por email para <strong>geral@luvimg.com</strong> a 30 dias do vencimento e enquanto a apólice estiver vencida.
          </p>
        </div>
        <Button onClick={() => openCreate()}><Plus className="h-4 w-4 mr-1" /> Registar seguro</Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Em dia" value={stats.ok} icon={<ShieldCheck />} status="ok" onClick={() => setStatusFilter("ok")} />
        <KpiCard label="A renovar 30d" value={stats.due_soon_30} icon={<Clock />} status="due_soon_30" onClick={() => setStatusFilter("due_soon_30")} />
        <KpiCard label="Vencidos" value={stats.overdue} icon={<CalendarX />} status="overdue" onClick={() => setStatusFilter("overdue")} />
        <KpiCard label="Sem registo" value={stats.missing} icon={<HelpCircle />} status="missing" onClick={() => setStatusFilter("missing")} />
      </div>

      {/* Coverage card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cobertura de apólices</CardTitle>
          <p className="text-xs text-muted-foreground">Edifícios com pelo menos uma apólice registada</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{coverage.covered} de {coverage.total} edifícios</span>
            <span className="text-sm text-muted-foreground">{coverage.pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${coverage.pct}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Filters + Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Apólices por edifício</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Pesquisar edifício, companhia, apólice, mediador..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
                <SelectItem value="due_soon_30">A renovar 30d</SelectItem>
                <SelectItem value="missing">Sem registo</SelectItem>
                <SelectItem value="ok">Em dia</SelectItem>
              </SelectContent>
            </Select>
            <Select value={insurerFilter} onValueChange={setInsurerFilter}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Companhia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as companhias</SelectItem>
                {insurers.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Edifício</TableHead>
                  <TableHead>Companhia</TableHead>
                  <TableHead>Nº Apólice</TableHead>
                  <TableHead>Mediador</TableHead>
                  <TableHead>Cobertura</TableHead>
                  <TableHead>Renovação</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sem resultados.</TableCell></TableRow>
                )}
                {filtered.map(r => {
                  const meta = INSURANCE_STATUS_META[r.status];
                  return (
                    <TableRow key={`${r.building_id}-${r.insurance_id ?? "none"}`}>
                      <TableCell className="font-medium">{r.building_code} - {r.building_name}</TableCell>
                      <TableCell>{r.insurer ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="font-mono text-xs">{r.policy_number ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.broker ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.coverage_type ? COVERAGE_LABEL[r.coverage_type] : "—"}</TableCell>
                      <TableCell>{r.renewal_date ? format(parseISO(r.renewal_date), "dd/MM/yyyy") : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(meta.bg, meta.color, meta.border)}>
                          {meta.label}
                          {r.days_until_renewal !== null && r.status !== "ok" && r.status !== "missing" && (
                            <span className="ml-1 opacity-80">
                              · {r.status === "overdue" ? `${Math.abs(r.days_until_renewal)}d` : `${r.days_until_renewal}d`}
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "missing" ? (
                          <Button size="sm" variant="ghost" onClick={() => openCreate(r.building_id)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Registar
                          </Button>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openRenew(r)} title="Renovar">
                              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Renovar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <InsuranceForm
        open={open}
        onOpenChange={setOpen}
        defaultBuildingId={presetBuilding}
        prefill={prefill}
        mode={mode}
      />
    </div>
  );
}

function KpiCard({ label, value, icon, status, onClick }: { label: string; value: number; icon: React.ReactNode; status: InsuranceStatus; onClick?: () => void }) {
  const meta = INSURANCE_STATUS_META[status];
  return (
    <button onClick={onClick} className={cn("text-left rounded-lg border p-4 transition hover:scale-[1.02] hover:shadow-md", meta.bg, meta.border)}>
      <div className={cn("flex items-center gap-2 text-xs font-medium uppercase tracking-wide", meta.color)}>
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span> {label}
      </div>
      <div className={cn("text-3xl font-bold mt-2", meta.color)}>{value}</div>
    </button>
  );
}
