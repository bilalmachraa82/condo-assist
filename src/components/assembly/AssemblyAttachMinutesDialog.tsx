import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, X } from "lucide-react";
import { useUploadBuildingDocument } from "@/hooks/useBuildingDocuments";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  buildingId: string;
  buildingLabel?: string;
  defaultYear?: number;
}

/**
 * Anexa a acta de uma assembleia como documento do edifício na categoria "atas".
 * Fica visível na aba "Documentos" do edifício.
 */
export default function AssemblyAttachMinutesDialog({
  open, onOpenChange, buildingId, buildingLabel, defaultYear,
}: Props) {
  const upload = useUploadBuildingDocument();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => { setFile(null); setTitle(""); setMeetingDate(""); setDescription(""); };

  const onSubmit = async () => {
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
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anexar acta {buildingLabel ? `· ${buildingLabel}` : ""}</DialogTitle>
          <DialogDescription>
            O ficheiro será guardado em <strong>Documentos &gt; Atas</strong> deste edifício.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Ficheiro PDF *</Label>
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept=".pdf,application/pdf"
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={!file || upload.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            {upload.isPending ? "A enviar…" : "Anexar acta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
