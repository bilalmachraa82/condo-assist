import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Upload, X, Sparkles, Loader2 } from "lucide-react";
import { useUploadBuildingDocument } from "@/hooks/useBuildingDocuments";
import { useCreateAssemblyItem } from "@/hooks/useAssemblyItems";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  buildingId: string;
  buildingLabel?: string;
  defaultYear?: number;
}

interface ExtractedTopic {
  title: string;
  description: string;
  category: string;
  priority: string;
  estimated_cost: number | null;
  notes: string | null;
  selected: boolean;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

export default function AssemblyAttachMinutesDialog({
  open, onOpenChange, buildingId, buildingLabel, defaultYear,
}: Props) {
  const upload = useUploadBuildingDocument();
  const createItem = useCreateAssemblyItem();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<ExtractedTopic[] | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFile(null); setTitle(""); setMeetingDate(""); setDescription("");
    setTopics(null); setExtracting(false); setImporting(false);
  };

  const onAttach = async () => {
    if (!file || !buildingId) return;
    try {
      await upload.mutateAsync({
        buildingId,
        file,
        category: "atas",
        title: title || `Acta ${defaultYear ?? new Date().getFullYear()} - ${file.name}`,
        description: description || null,
        documentDate: meetingDate || undefined,
      });
      toast({ title: "Acta anexada", description: "Visível na aba Documentos do edifício." });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const onExtract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("parse-assembly-minutes", {
        body: { fileBase64, mimeType: file.type || "application/pdf" },
      });
      if (error) throw error;
      const list: any[] = (data as any)?.topics ?? [];
      if (!list.length) {
        toast({ title: "Sem assuntos", description: "A IA não identificou assuntos. Verifica o ficheiro.", variant: "destructive" });
        return;
      }
      setTopics(list.map((t) => ({ ...t, selected: true })));
      toast({ title: `${list.length} assunto(s) extraído(s)`, description: "Revê e importa os que pretendes." });
    } catch (e: any) {
      toast({ title: "Erro IA", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const onImport = async () => {
    if (!topics) return;
    const selected = topics.filter((t) => t.selected);
    if (!selected.length) return;
    setImporting(true);
    try {
      // Get building code (assembly_items requires it)
      const { data: b } = await supabase
        .from("buildings").select("code, address").eq("id", buildingId).maybeSingle();
      const code = parseInt(String(b?.code ?? "0"), 10) || 0;
      const year = defaultYear ?? (meetingDate ? new Date(meetingDate).getFullYear() : new Date().getFullYear());

      for (const t of selected) {
        await createItem.mutateAsync({
          building_id: buildingId,
          building_code: code,
          building_address: b?.address ?? null,
          year,
          description: t.description || t.title,
          status: "pending",
          status_notes: t.notes,
          category: t.category,
          priority: t.priority,
          assigned_to: null,
          estimated_cost: t.estimated_cost,
          resolution_date: meetingDate || null,
        } as any);
      }
      toast({ title: `${selected.length} assunto(s) importado(s)` });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const toggleAll = (val: boolean) =>
    setTopics((ts) => ts ? ts.map((t) => ({ ...t, selected: val })) : ts);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Anexar acta {buildingLabel ? `· ${buildingLabel}` : ""}</DialogTitle>
          <DialogDescription>
            Anexa o PDF e, opcionalmente, deixa a IA extrair os assuntos para tratamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1">
          <div>
            <Label className="text-xs">Ficheiro PDF *</Label>
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setFile(null); setTopics(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept=".pdf,application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Data da assembleia</Label>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Título (opcional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Acta ${defaultYear ?? new Date().getFullYear()}`} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {file && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Extrair assuntos com IA
                </div>
                <Button size="sm" variant="secondary" onClick={onExtract} disabled={extracting}>
                  {extracting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A analisar…</> : "Analisar acta"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A IA tenta identificar cada deliberação/assunto e prepara para importar como pendentes.
              </p>
            </div>
          )}

          {topics && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{topics.length} assunto(s) detectado(s)</div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleAll(true)}>Todos</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>Nenhum</Button>
                </div>
              </div>
              <ScrollArea className="h-64 rounded-md border">
                <div className="p-2 space-y-2">
                  {topics.map((t, i) => (
                    <div key={i} className="flex gap-2 rounded-md border p-2 text-sm">
                      <Checkbox
                        checked={t.selected}
                        onCheckedChange={(v) =>
                          setTopics((ts) => ts!.map((x, j) => j === i ? { ...x, selected: !!v } : x))
                        }
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{t.title || "(sem título)"}</div>
                        {t.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">{t.category}</Badge>
                          <Badge variant="outline" className="text-xs">{t.priority}</Badge>
                          {t.estimated_cost && (
                            <Badge variant="outline" className="text-xs">{t.estimated_cost.toLocaleString("pt-PT")} €</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="secondary" onClick={onAttach} disabled={!file || upload.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            {upload.isPending ? "A enviar…" : "Anexar acta"}
          </Button>
          {topics && (
            <Button onClick={onImport} disabled={importing || !topics.some((t) => t.selected)}>
              {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A importar…</> : "Importar selecionados"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
