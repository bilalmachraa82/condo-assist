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
import { Plus, Search, Key, CheckCircle2, Trash2 } from "lucide-react";
import { useBuildings } from "@/hooks/useBuildings";
import { useKeyHandovers, useCreateKeyHandover, useUpdateKeyHandover, useDeleteKeyHandover } from "@/hooks/useKeyHandovers";

export default function Keys() {
  const { data: handovers = [], isLoading } = useKeyHandovers();
  const { data: buildings = [] } = useBuildings();
  const create = useCreateKeyHandover();
  const update = useUpdateKeyHandover();
  const remove = useDeleteKeyHandover();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [returnId, setReturnId] = useState<string | null>(null);

  const [bId, setBId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [returnedBy, setReturnedBy] = useState("");

  const filtered = useMemo(() => handovers.filter((h) => {
    if (statusFilter === "open" && h.returned_at) return false;
    if (statusFilter === "returned" && !h.returned_at) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = [h.picked_up_by_name, h.returned_by_name, h.purpose, h.buildings?.code, h.buildings?.name].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [handovers, search, statusFilter]);

  const stats = useMemo(() => ({
    open: handovers.filter((h) => !h.returned_at).length,
    returned: handovers.filter((h) => !!h.returned_at).length,
  }), [handovers]);

  const onCreate = async () => {
    if (!bId || !name.trim()) return;
    await create.mutateAsync({
      building_id: bId, picked_up_by_name: name.trim(),
      picked_up_by_phone: phone || null, purpose: purpose || null, notes: notes || null,
    });
    setOpen(false); setBId(""); setName(""); setPhone(""); setPurpose(""); setNotes("");
  };

  const onReturn = async () => {
    if (!returnId) return;
    await update.mutateAsync({ id: returnId, returned_by_name: returnedBy || "—", returned_at: new Date().toISOString() });
    setReturnId(null); setReturnedBy("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Key className="h-6 w-6 text-primary" /> Relatório de Chaves</h1>
          <p className="text-sm text-muted-foreground">Registo de levantamento e devolução de chaves dos edifícios.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Registar levantamento</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Em uso</div><div className="text-2xl font-bold text-warning">{stats.open}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Devolvidas</div><div className="text-2xl font-bold">{stats.returned}</div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Procurar pessoa, edifício, motivo…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Em uso</SelectItem>
            <SelectItem value="returned">Devolvidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Edifício</TableHead>
                <TableHead>Quem pegou</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Quem entregou</TableHead>
                <TableHead>Data devolução</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="w-32 text-right">Acções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">A carregar…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sem registos.</TableCell></TableRow>
              )}
              {filtered.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.buildings ? `${h.buildings.code} - ${h.buildings.name}` : "—"}</TableCell>
                  <TableCell>{h.picked_up_by_name}{h.picked_up_by_phone ? <div className="text-xs text-muted-foreground">{h.picked_up_by_phone}</div> : null}</TableCell>
                  <TableCell className="text-sm">{format(new Date(h.picked_up_at), "dd/MM/yy HH:mm", { locale: pt })}</TableCell>
                  <TableCell>{h.returned_by_name ?? <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">Em uso</Badge>}</TableCell>
                  <TableCell className="text-sm">{h.returned_at ? format(new Date(h.returned_at), "dd/MM/yy HH:mm", { locale: pt }) : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{h.purpose ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {!h.returned_at && (
                      <Button size="sm" variant="ghost" onClick={() => setReturnId(h.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Devolver
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(h.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registar levantamento de chave</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Edifício</Label>
              <Select value={bId} onValueChange={setBId}>
                <SelectTrigger><SelectValue placeholder="Selecionar edifício" /></SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{b.code} - {b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Quem pegou *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Telemóvel</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
            <div><Label>Motivo / Para quem</Label><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Ex: Entrega ao fornecedor X" /></div>
            <div><Label>Notas</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={onCreate} disabled={!bId || !name.trim() || create.isPending}>Registar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return */}
      <Dialog open={!!returnId} onOpenChange={(o) => !o && setReturnId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como devolvida</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Quem devolveu</Label><Input value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)} placeholder="Nome de quem devolveu" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnId(null)}>Cancelar</Button>
            <Button onClick={onReturn} disabled={update.isPending}>Confirmar devolução</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
