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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ShieldAlert, FileText, Trash2, Upload, Download, Eye } from "lucide-react";
import { useBuildings } from "@/hooks/useBuildings";
import {
  useInsuranceClaims, useCreateInsuranceClaim, useUpdateInsuranceClaim, useDeleteInsuranceClaim,
  useClaimAttachments, useUploadClaimAttachment, useDeleteClaimAttachment,
  useClaimNotes, useAddClaimNote, getClaimAttachmentSignedUrl,
  CLAIM_STATUS_LABELS, CLAIM_OPEN_STATUSES, type ClaimStatus, type InsuranceClaim,
} from "@/hooks/useInsuranceClaims";
import AttachmentPreviewDialog, { type PreviewAttachment } from "@/components/pendencies/AttachmentPreviewDialog";
import { formatBuildingLabel } from "@/utils/buildingDisplay";

const statusColor = (s: ClaimStatus) => {
  if (s === "pago") return "bg-success/15 text-success border-success/30";
  if (s === "recusado" || s === "arquivado") return "bg-muted text-muted-foreground border-border";
  return "bg-warning/15 text-warning border-warning/30";
};

export default function Sinistros() {
  const { data: claims = [], isLoading } = useInsuranceClaims();
  const { data: buildings = [] } = useBuildings();
  const create = useCreateInsuranceClaim();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [bId, setBId] = useState("");
  const [desc, setDesc] = useState("");
  const [occDate, setOccDate] = useState("");
  const [location, setLocation] = useState("");
  const [estAmount, setEstAmount] = useState("");
  const [insurerRef, setInsurerRef] = useState("");
  const [insurerContact, setInsurerContact] = useState("");

  const filtered = useMemo(() => claims.filter((c) => {
    if (statusFilter === "open" && !CLAIM_OPEN_STATUSES.includes(c.status)) return false;
    if (statusFilter !== "all" && statusFilter !== "open" && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = [c.claim_number, c.description, c.damage_location, c.insurer_claim_ref, c.buildings?.code, c.buildings?.name].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [claims, search, statusFilter]);

  const stats = useMemo(() => ({
    open: claims.filter((c) => CLAIM_OPEN_STATUSES.includes(c.status)).length,
    paid: claims.filter((c) => c.status === "pago").length,
    refused: claims.filter((c) => c.status === "recusado").length,
  }), [claims]);

  const onCreate = async () => {
    if (!bId || !desc.trim()) return;
    const c = await create.mutateAsync({
      building_id: bId, description: desc.trim(),
      occurrence_date: occDate || null,
      reported_date: new Date().toISOString().slice(0, 10),
      damage_location: location || null,
      estimated_amount: estAmount ? Number(estAmount) : null,
      insurer_claim_ref: insurerRef || null,
      insurer_contact: insurerContact || null,
    });
    setOpen(false); setBId(""); setDesc(""); setOccDate(""); setLocation(""); setEstAmount(""); setInsurerRef(""); setInsurerContact("");
    if (c) setSelectedId(c.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-primary" /> Participações de Sinistro</h1>
          <p className="text-sm text-muted-foreground">Processos de sinistro do condomínio.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Abrir participação</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Em aberto</div><div className="text-2xl font-bold text-warning">{stats.open}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pagos</div><div className="text-2xl font-bold text-success">{stats.paid}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Recusados</div><div className="text-2xl font-bold">{stats.refused}</div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Procurar nº, descrição, edifício…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Em aberto</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(CLAIM_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {!isLoading && filtered.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-60" />
          Sem participações.
        </CardContent></Card>
      )}

      <div className="space-y-2">
        {filtered.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setSelectedId(c.id)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    <span className="text-primary">#{c.claim_number}</span>
                    <span className="truncate">{c.description}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                    {c.buildings && <span>{formatBuildingLabel(c.buildings)}</span>}
                    {c.occurrence_date && <span>Ocorrência: {format(new Date(c.occurrence_date), "dd/MM/yyyy", { locale: pt })}</span>}
                    {c.estimated_amount != null && <span>Estimado: {Number(c.estimated_amount).toFixed(2)} €</span>}
                  </div>
                </div>
                <Badge variant="outline" className={statusColor(c.status)}>{CLAIM_STATUS_LABELS[c.status]}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Abrir participação de sinistro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Edifício *</Label>
              <Select value={bId} onValueChange={setBId}>
                <SelectTrigger><SelectValue placeholder="Selecionar edifício" /></SelectTrigger>
                <SelectContent>{buildings.map((b) => <SelectItem key={b.id} value={b.id}>{formatBuildingLabel(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição do que se passou *</Label>
              <Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Data da ocorrência</Label><Input type="date" value={occDate} onChange={(e) => setOccDate(e.target.value)} /></div>
              <div><Label>Valor estimado (€)</Label><Input type="number" step="0.01" value={estAmount} onChange={(e) => setEstAmount(e.target.value)} /></div>
            </div>
            <div><Label>Local dos danos</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Garagem, fração 3ºD" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Nº processo seguradora</Label><Input value={insurerRef} onChange={(e) => setInsurerRef(e.target.value)} /></div>
              <div><Label>Contacto seguradora</Label><Input value={insurerContact} onChange={(e) => setInsurerContact(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={onCreate} disabled={!bId || !desc.trim() || create.isPending}>Abrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClaimDetail id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function ClaimDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const claims = useInsuranceClaims().data ?? [];
  const c = id ? claims.find((x) => x.id === id) : null;
  const update = useUpdateInsuranceClaim();
  const remove = useDeleteInsuranceClaim();
  const { data: atts = [] } = useClaimAttachments(id);
  const upload = useUploadClaimAttachment();
  const delAtt = useDeleteClaimAttachment();
  const { data: notes = [] } = useClaimNotes(id);
  const addNote = useAddClaimNote();
  const [noteText, setNoteText] = useState("");
  const [preview, setPreview] = useState<PreviewAttachment | null>(null);

  if (!c) return null;

  const onUpload = async (f: File | null) => {
    if (!f) return;
    await upload.mutateAsync({ claimId: c.id, file: f });
  };

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-primary">#{c.claim_number}</span>
            <Badge variant="outline">{CLAIM_STATUS_LABELS[c.status]}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <Label className="text-xs">Estado</Label>
            <Select value={c.status} onValueChange={(v: ClaimStatus) => update.mutate({ id: c.id, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CLAIM_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Valor final (€)</Label>
            <Input type="number" step="0.01" defaultValue={c.final_amount ?? ""} onBlur={(e) => update.mutate({ id: c.id, final_amount: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </div>

        <Tabs defaultValue="dados" className="mt-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="anexos">Anexos ({atts.length})</TabsTrigger>
            <TabsTrigger value="notas">Notas ({notes.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="dados" className="space-y-3">
            <div><Label className="text-xs">Descrição</Label>
              <Textarea defaultValue={c.description} rows={4} onBlur={(e) => e.target.value !== c.description && update.mutate({ id: c.id, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Local</Label>
                <Input defaultValue={c.damage_location ?? ""} onBlur={(e) => update.mutate({ id: c.id, damage_location: e.target.value || null })} />
              </div>
              <div><Label className="text-xs">Data ocorrência</Label>
                <Input type="date" defaultValue={c.occurrence_date ?? ""} onBlur={(e) => update.mutate({ id: c.id, occurrence_date: e.target.value || null })} />
              </div>
              <div><Label className="text-xs">Nº processo seguradora</Label>
                <Input defaultValue={c.insurer_claim_ref ?? ""} onBlur={(e) => update.mutate({ id: c.id, insurer_claim_ref: e.target.value || null })} />
              </div>
              <div><Label className="text-xs">Contacto</Label>
                <Input defaultValue={c.insurer_contact ?? ""} onBlur={(e) => update.mutate({ id: c.id, insurer_contact: e.target.value || null })} />
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { if (confirm("Apagar sinistro?")) { await remove.mutateAsync(c.id); onClose(); } }}>
              <Trash2 className="h-4 w-4 mr-1" /> Apagar
            </Button>
          </TabsContent>

          <TabsContent value="anexos" className="space-y-3">
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <Input type="file" onChange={(e) => onUpload(e.target.files?.[0] ?? null)} className="max-w-xs mx-auto" disabled={upload.isPending} />
            </div>
            {atts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.file_name}</div>
                    <div className="text-xs text-muted-foreground">{a.kind} · {format(new Date(a.created_at), "dd/MM/yy HH:mm", { locale: pt })}</div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setPreview({ filePath: a.file_path, fileName: a.file_name, mimeType: a.mime_type })}><Eye className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={async () => { const u = await getClaimAttachmentSignedUrl(a.file_path); const e = document.createElement("a"); e.href = u; e.download = a.file_name; e.click(); }}><Download className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => delAtt.mutate({ id: a.id, claimId: c.id, filePath: a.file_path })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="notas" className="space-y-3">
            <Textarea rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Adicionar nota…" />
            <Button size="sm" disabled={!noteText.trim() || addNote.isPending} onClick={async () => { await addNote.mutateAsync({ claimId: c.id, body: noteText.trim() }); setNoteText(""); }}>Adicionar</Button>
            {notes.map((n: any) => (
              <div key={n.id} className="border rounded-md p-2 text-sm">
                <div className="text-xs text-muted-foreground mb-1">{format(new Date(n.created_at), "dd/MM/yy HH:mm", { locale: pt })}</div>
                <div className="whitespace-pre-wrap">{n.body}</div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <AttachmentPreviewDialog attachment={preview} onOpenChange={(o) => !o && setPreview(null)} bucket="building-documents" />
      </SheetContent>
    </Sheet>
  );
}
