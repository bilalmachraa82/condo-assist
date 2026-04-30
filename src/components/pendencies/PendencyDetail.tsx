import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  usePendency, usePendencyNotes, usePendencyAttachments,
  useUpdatePendency, useAddPendencyNote, useUploadPendencyFile,
  useDeletePendencyAttachment, getPendencyFileSignedUrl,
  PENDENCY_STATUS_LABELS, PENDENCY_STATUS_ORDER, pendencySLA,
  type PendencyStatus,
} from "@/hooks/usePendencies";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PriorityBadge } from "@/components/ui/status-badges";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText, Upload, Trash2, Eye, MessageSquare, Building2, Wrench, User, Calendar, Clock, Bell, BellOff, Plus,
} from "lucide-react";
import { usePendencyReminders, useCreatePendencyReminder, useCancelPendencyReminder } from "@/hooks/usePendencyReminders";

interface Props {
  pendencyId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const slaColor = (s: "ok" | "warn" | "danger") =>
  s === "danger" ? "bg-destructive/15 text-destructive border-destructive/30"
    : s === "warn" ? "bg-warning/15 text-warning border-warning/30"
    : "bg-success/15 text-success border-success/30";

const slaLabel = (s: "ok" | "warn" | "danger") =>
  s === "danger" ? "SLA vencido" : s === "warn" ? "SLA em risco" : "Em dia";

export default function PendencyDetail({ pendencyId, open, onOpenChange }: Props) {
  const { data: p } = usePendency(pendencyId);
  const { data: notes } = usePendencyNotes(pendencyId);
  const { data: attachments } = usePendencyAttachments(pendencyId);
  const update = useUpdatePendency();
  const addNote = useAddPendencyNote();
  const upload = useUploadPendencyFile();
  const del = useDeletePendencyAttachment();
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const { data: reminders } = usePendencyReminders(pendencyId);
  const createReminder = useCreatePendencyReminder();
  const cancelReminder = useCancelPendencyReminder();
  const [reminderWhen, setReminderWhen] = useState("");
  const [reminderNote, setReminderNote] = useState("");

  if (!p) return null;
  const sla = pendencySLA(p);

  const onPreview = async (path: string) => {
    const url = await getPendencyFileSignedUrl(path);
    window.open(url, "_blank", "noopener");
  };

  const onUpload = async (f: File | null) => {
    if (!f || !p) return;
    await upload.mutateAsync({ pendencyId: p.id, file: f, kind: "attachment" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg">{p.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap mt-1">
                {p.buildings && (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Building2 className="h-3 w-3" />{p.buildings.code} - {p.buildings.name}
                  </span>
                )}
                {p.assistances && (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Wrench className="h-3 w-3" />#{p.assistances.assistance_number}
                  </span>
                )}
                {p.suppliers && (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <User className="h-3 w-3" />{p.suppliers.name}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <PriorityBadge priority={p.priority} />
            <Badge variant="outline" className={slaColor(sla)}>{slaLabel(sla)}</Badge>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Última actividade {format(new Date(p.last_activity_at), "dd/MM/yyyy HH:mm", { locale: pt })}
            </span>
          </div>
        </SheetHeader>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div>
            <label className="text-xs text-muted-foreground">Estado</label>
            <Select value={p.status} onValueChange={(v: PendencyStatus) => update.mutate({ id: p.id, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PENDENCY_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{PENDENCY_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Prioridade</label>
            <Select value={p.priority} onValueChange={(v: any) => update.mutate({ id: p.id, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="resumo" className="mt-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="anexos">Anexos ({attachments?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="lembretes">Lembretes ({reminders?.filter((r) => r.status === "pending").length ?? 0})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({notes?.length ?? 0})</TabsTrigger>
          </TabsList>

          {/* RESUMO */}
          <TabsContent value="resumo" className="space-y-3">
            {p.subject && (
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Assunto do email</div>
                <div>{p.subject}</div>
              </div>
            )}
            {p.email_sent_at && (
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Email enviado em</div>
                <div className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(p.email_sent_at), "dd/MM/yyyy HH:mm", { locale: pt })}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground">Descrição / contexto</div>
              <Textarea
                defaultValue={p.description ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (p.description ?? "")) {
                    update.mutate({ id: p.id, description: e.target.value });
                  }
                }}
                rows={4}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Data limite</div>
              <Input
                type="date"
                defaultValue={p.due_date ? p.due_date.slice(0, 10) : ""}
                onBlur={(e) => update.mutate({ id: p.id, due_date: e.target.value || null })}
              />
            </div>
          </TabsContent>

          {/* ANEXOS */}
          <TabsContent value="anexos" className="space-y-3">
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/30 transition"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onUpload(e.dataTransfer.files?.[0] ?? null); }}
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Arrasta um ficheiro ou</p>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.eml"
                onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
                className="max-w-xs mx-auto"
                disabled={upload.isPending}
              />
            </div>
            <div className="space-y-2">
              {attachments?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem anexos.</p>}
              {attachments?.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: pt })} · {a.kind}
                        {a.file_size ? ` · ${(Number(a.file_size) / 1024).toFixed(0)} KB` : ""}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onPreview(a.file_path)}><Eye className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover anexo?</AlertDialogTitle>
                        <AlertDialogDescription>{a.file_name}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => del.mutate({ id: a.id, pendencyId: p.id, filePath: a.file_path })}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="space-y-3">
            <div className="space-y-2">
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Adicionar nota interna…" rows={3} />
              <Button
                size="sm"
                onClick={async () => {
                  if (!noteText.trim()) return;
                  await addNote.mutateAsync({ pendencyId: p.id, body: noteText.trim() });
                  setNoteText("");
                }}
                disabled={!noteText.trim() || addNote.isPending}
              >
                <MessageSquare className="h-4 w-4 mr-2" /> Adicionar nota
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              {notes?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem actividade ainda.</p>}
              {notes?.map((n: any) => (
                <div
                  key={n.id}
                  className={`border rounded-md p-3 text-sm ${
                    n.note_type === "status_change"
                      ? "bg-muted/50 border-dashed"
                      : "bg-card"
                  }`}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                    {n.note_type === "status_change" && " · mudança de estado"}
                    {n.note_type === "system" && " · sistema"}
                  </div>
                  <div className="whitespace-pre-wrap">{n.body}</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
