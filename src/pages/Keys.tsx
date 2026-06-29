import { useState, useMemo } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Key, CheckCircle2, Trash2, Pencil, Printer } from "lucide-react";
import { useBuildings } from "@/hooks/useBuildings";
import { useKeyHandovers, useCreateKeyHandover, useUpdateKeyHandover, useDeleteKeyHandover, type KeyHandover } from "@/hooks/useKeyHandovers";
import { formatBuildingLabel } from "@/utils/buildingDisplay";

const emptyForm = {
  building_id: "",
  picked_up_by_name: "",
  company_name: "",
  notes: "",
};

const escapeHtml = (value: string | null | undefined) =>
  (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export default function Keys() {
  const { data: handovers = [], isLoading } = useKeyHandovers();
  const { data: buildings = [] } = useBuildings();
  const create = useCreateKeyHandover();
  const update = useUpdateKeyHandover();
  const remove = useDeleteKeyHandover();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KeyHandover | null>(null);
  const [returnRow, setReturnRow] = useState<KeyHandover | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [returnedBy, setReturnedBy] = useState("");

  const buildingLabel = (h: KeyHandover) => formatBuildingLabel(h.buildings, "—");

  const filtered = useMemo(() => handovers.filter((h) => {
    if (statusFilter === "open" && h.returned_at) return false;
    if (statusFilter === "returned" && !h.returned_at) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = [
        h.picked_up_by_name,
        h.returned_by_name,
        h.notes,
        h.buildings?.code,
        h.buildings?.name,
        h.buildings?.address,
        h.company_name,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    const cmp = (a.buildings?.code ?? "zzz").localeCompare(b.buildings?.code ?? "zzz", "pt", { numeric: true });
    if (cmp !== 0) return cmp;
    return new Date(b.picked_up_at).getTime() - new Date(a.picked_up_at).getTime();
  }), [handovers, search, statusFilter]);

  const stats = useMemo(() => ({
    open: handovers.filter((h) => !h.returned_at).length,
    returned: handovers.filter((h) => !!h.returned_at).length,
  }), [handovers]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (h: KeyHandover) => {
    setEditing(h);
    setForm({
      building_id: h.building_id,
      picked_up_by_name: h.picked_up_by_name ?? "",
      company_name: h.company_name ?? "",
      notes: h.notes ?? h.purpose ?? "",
    });
    setOpen(true);
  };

  const onSave = async () => {
    if (!form.building_id || !form.picked_up_by_name.trim()) return;
    const payload: Partial<KeyHandover> & { building_id: string; picked_up_by_name: string } = {
      building_id: form.building_id,
      picked_up_by_name: form.picked_up_by_name.trim(),
      company_name: form.company_name || null,
      notes: form.notes || null,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    setOpen(false);
    setForm({ ...emptyForm });
    setEditing(null);
  };

  const onReturn = async () => {
    if (!returnRow) return;
    if (!returnedBy.trim()) return;
    await update.mutateAsync({
      id: returnRow.id,
      returned_by_name: returnedBy.trim(),
      returned_at: new Date().toISOString(),
    });
    setReturnRow(null); setReturnedBy("");
  };

  const printInUse = () => {
    const inUse = handovers.filter((h) => !h.returned_at).sort((a, b) => {
      const cmp = (a.buildings?.code ?? "zzz").localeCompare(b.buildings?.code ?? "zzz", "pt", { numeric: true });
      if (cmp !== 0) return cmp;
      return new Date(b.picked_up_at).getTime() - new Date(a.picked_up_at).getTime();
    });
    const rows = inUse.map((h, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(buildingLabel(h))}</td>
        <td>${escapeHtml(h.picked_up_by_name)}</td>
        <td>${escapeHtml(h.company_name || "—")}</td>
        <td>${format(new Date(h.picked_up_at), "dd/MM/yyyy HH:mm", { locale: pt })}</td>
        <td>${escapeHtml(h.notes || "—")}</td>
      </tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Chaves em uso</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 4px}
        .sub{color:#666;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
        th{background:#f3f4f6}
      </style></head><body>
      <h1>Chaves em uso</h1>
      <div class="sub">Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: pt })} · Total: ${inUse.length}</div>
      <table><thead><tr>
        <th>N.º</th><th>Edifício</th><th>Colaborador Luvimg</th><th>Empresa</th><th>Data levantamento</th><th>Notas</th>
      </tr></thead><tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:#666">Sem chaves em uso.</td></tr>`}</tbody></table>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html); w.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Key className="h-6 w-6 text-primary" /> Relatório de Chaves</h1>
          <p className="text-sm text-muted-foreground">Registo de levantamento e devolução de chaves dos edifícios.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printInUse}><Printer className="h-4 w-4 mr-2" /> Imprimir chaves em uso</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Registar levantamento</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.open + stats.returned}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Em uso</div><div className="text-2xl font-bold text-warning">{stats.open}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Devolvidas</div><div className="text-2xl font-bold">{stats.returned}</div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Procurar colaborador, morada, notas, empresa…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Entregues</SelectItem>
            <SelectItem value="returned">Recebidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">N.º</TableHead>
                <TableHead>Edifício</TableHead>
                <TableHead>Colaborador Luvimg</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Devolução</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="w-32 text-right">Acções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">A carregar…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sem registos.</TableCell></TableRow>
              )}
              {filtered.map((h, index) => (
                <TableRow key={h.id}>
                  <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{buildingLabel(h)}</TableCell>
                  <TableCell>{h.picked_up_by_name}</TableCell>
                  <TableCell className="text-sm">{h.company_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(h.picked_up_at), "dd/MM/yy HH:mm", { locale: pt })}</TableCell>
                  <TableCell className="text-sm">
                    {h.returned_at ? (
                      <div className="space-y-1">
                        <Badge variant="outline" className="bg-success/15 text-success border-success/30">Recebida</Badge>
                        <div>{format(new Date(h.returned_at), "dd/MM/yy HH:mm", { locale: pt })}</div>
                        <div className="text-xs text-muted-foreground">{h.returned_by_name}</div>
                      </div>
                    ) : <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">Entregue</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{h.notes ?? "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {!h.returned_at && (
                      <Button size="sm" variant="ghost" onClick={() => { setReturnedBy(""); setReturnRow(h); }} title="Marcar receção">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(h)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(h.id)} title="Apagar">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar levantamento" : "Registar levantamento de chave"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Edifício *</Label>
              <Select value={form.building_id} onValueChange={(v) => setForm((f) => ({ ...f, building_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar edifício" /></SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{formatBuildingLabel(b)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Colaborador Luvimg *</Label><Input value={form.picked_up_by_name} onChange={(e) => setForm((f) => ({ ...f, picked_up_by_name: e.target.value }))} placeholder="Quem ficou responsável pela chave" /></div>
            <div><Label>Empresa</Label><Input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Ex: Schindler" /></div>
            <div><Label>Notas</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={onSave} disabled={!form.building_id || !form.picked_up_by_name.trim() || create.isPending || update.isPending}>
              {editing ? "Guardar alterações" : "Registar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return */}
      <Dialog open={!!returnRow} onOpenChange={(o) => { if (!o) { setReturnRow(null); setReturnedBy(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como recebida</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Colaborador Luvimg *</Label><Input value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)} placeholder="Nome do colaborador" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnRow(null)}>Cancelar</Button>
            <Button onClick={onReturn} disabled={update.isPending || !returnedBy.trim()}>Confirmar devolução</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
