import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, X, Bell } from "lucide-react";
import { useCreatePendency, useUploadPendencyFile, PENDENCY_STATUS_LABELS, PENDENCY_STATUS_ORDER } from "@/hooks/usePendencies";
import { useCreatePendencyReminder } from "@/hooks/usePendencyReminders";
import { Switch } from "@/components/ui/switch";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialFile?: File | null;
  defaults?: {
    building_id?: string;
    assistance_id?: string;
    supplier_id?: string;
    subject?: string;
    title?: string;
  };
  onCreated?: (pendencyId: string) => void;
}

export default function CreatePendencyDialog({ open, onOpenChange, initialFile, defaults, onCreated }: Props) {
  const create = useCreatePendency();
  const upload = useUploadPendencyFile();
  const createReminder = useCreatePendencyReminder();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [buildingId, setBuildingId] = useState<string>("");
  const [assistanceId, setAssistanceId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [priority, setPriority] = useState<"normal" | "urgent" | "critical">("normal");
  const [emailSentAt, setEmailSentAt] = useState<string>("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderWhen, setReminderWhen] = useState<string>("");
  const [reminderNote, setReminderNote] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setFile(initialFile ?? null);
    setTitle(defaults?.title ?? (initialFile?.name?.replace(/\.[^.]+$/, "") ?? ""));
    setSubject(defaults?.subject ?? "");
    setDescription("");
    setBuildingId(defaults?.building_id ?? "");
    setAssistanceId(defaults?.assistance_id ?? "");
    setSupplierId(defaults?.supplier_id ?? "");
    setPriority("normal");
    setEmailSentAt("");
    setReminderEnabled(false);
    const dt = new Date(Date.now() + 3 * 86400000); dt.setHours(9, 0, 0, 0);
    setReminderWhen(dt.toISOString().slice(0, 16));
    setReminderNote("");
  }, [open, initialFile, defaults]);

  const { data: buildings } = useQuery({
    queryKey: ["buildings-for-pendency"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("buildings").select("id, code, name").eq("is_active", true).order("code");
      if (error) throw error;
      return data;
    },
  });
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-for-pendency"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
  const { data: assistances } = useQuery({
    queryKey: ["assistances-for-pendency", buildingId],
    enabled: open && !!buildingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistances")
        .select("id, assistance_number, title")
        .eq("building_id", buildingId)
        .order("assistance_number", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleFile = (f: File | null) => {
    if (!f) return setFile(null);
    if (f.size > 15 * 1024 * 1024) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = async () => {
    if (!buildingId || !title) return;
    const created = await create.mutateAsync({
      title,
      description: description || null,
      subject: subject || null,
      email_sent_at: emailSentAt || null,
      building_id: buildingId,
      assistance_id: assistanceId || null,
      supplier_id: supplierId || null,
      priority,
      status: "aberto",
    });
    if (file && created?.id) {
      await upload.mutateAsync({ pendencyId: created.id, file, kind: "email_pdf" });
    }
    if (reminderEnabled && reminderWhen && created?.id) {
      try {
        await createReminder.mutateAsync({
          pendency_id: created.id,
          scheduled_for: new Date(reminderWhen).toISOString(),
          note: reminderNote || null,
          reminder_type: "manual",
        });
      } catch {/* toast handled inside */}
    }
    onCreated?.(created.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova pendência de email</DialogTitle>
          <DialogDescription>Anexa o PDF do email enviado e regista o caso para seguimento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File drop */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null); }}
            className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/30 transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Arrasta o PDF do email para aqui</p>
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.eml,application/pdf,image/*,message/rfc822"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  className="max-w-xs mx-auto"
                />
                <p className="text-xs text-muted-foreground mt-1">PDF, imagens ou .eml · máx. 15MB</p>
              </>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Pedido orçamento elevador" />
            </div>

            <div>
              <Label>Edifício *</Label>
              <Select value={buildingId} onValueChange={setBuildingId}>
                <SelectTrigger><SelectValue placeholder="Escolher edifício…" /></SelectTrigger>
                <SelectContent>
                  {buildings?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.code} - {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fornecedor (opcional)</Label>
              <Select value={supplierId || "none"} onValueChange={(v) => setSupplierId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {suppliers?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Assistência relacionada (opcional)</Label>
              <Select value={assistanceId || "none"} onValueChange={(v) => setAssistanceId(v === "none" ? "" : v)} disabled={!buildingId}>
                <SelectTrigger><SelectValue placeholder={buildingId ? "Nenhuma" : "Escolhe edifício primeiro"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhuma —</SelectItem>
                  {assistances?.map((a) => <SelectItem key={a.id} value={a.id}>#{a.assistance_number} {a.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label>Assunto do email (opcional)</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto original do email" />
            </div>

            <div>
              <Label>Data do email (opcional)</Label>
              <Input type="datetime-local" value={emailSentAt} onChange={(e) => setEmailSentAt(e.target.value)} />
            </div>

            <div>
              <Label>Estado inicial</Label>
              <div className="text-sm text-muted-foreground pt-2">{PENDENCY_STATUS_LABELS.aberto} (predefinido)</div>
            </div>

            <div className="sm:col-span-2">
              <Label>Notas / contexto interno</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes do que foi pedido, o que falta, etc." />
            </div>
          </div>

          {/* Reminder option */}
          <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Bell className="h-4 w-4 text-warning" /> Agendar lembrete
              </Label>
              <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
            </div>
            {reminderEnabled && (
              <div className="space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Data e hora</Label>
                    <Input
                      type="datetime-local"
                      value={reminderWhen}
                      onChange={(e) => setReminderWhen(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nota (opcional)</Label>
                    <Input value={reminderNote} onChange={(e) => setReminderNote(e.target.value)} placeholder="Ex.: confirmar resposta do fornecedor" />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[{ l: "+1 dia", d: 1 }, { l: "+3 dias", d: 3 }, { l: "+1 semana", d: 7 }].map((q) => (
                    <Button key={q.l} type="button" variant="outline" size="sm"
                      onClick={() => {
                        const dt = new Date(Date.now() + q.d * 86400000);
                        dt.setHours(9, 0, 0, 0);
                        setReminderWhen(dt.toISOString().slice(0, 16));
                      }}>
                      {q.l}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Receberás um email automático em <strong>geral@luvimg.com</strong> à hora marcada.
                  Lembretes SLA (3/7/14 dias) são criados automaticamente quando passares a "Aguarda resposta".
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!buildingId || !title || create.isPending || upload.isPending}>
            {create.isPending || upload.isPending ? "A criar…" : "Criar pendência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
