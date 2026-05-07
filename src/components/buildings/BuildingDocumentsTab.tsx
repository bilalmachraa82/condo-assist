import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Trash2, Eye, Upload, Archive } from "lucide-react";
import {
  useBuildingDocuments, useUploadBuildingDocument, useDeleteBuildingDocument,
  getBuildingDocumentSignedUrl, downloadAllBuildingDocumentsAsZip, DOCUMENT_CATEGORIES,
} from "@/hooks/useBuildingDocuments";
import { useToast } from "@/hooks/use-toast";
import AttachmentPreviewDialog, { type PreviewAttachment } from "@/components/pendencies/AttachmentPreviewDialog";

interface Props { buildingId: string; buildingLabel?: string; }

export default function BuildingDocumentsTab({ buildingId, buildingLabel }: Props) {
  const { data: docs = [], isLoading } = useBuildingDocuments(buildingId);
  const upload = useUploadBuildingDocument();
  const remove = useDeleteBuildingDocument();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("outros");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [docDate, setDocDate] = useState("");
  const [zipping, setZipping] = useState(false);
  const [preview, setPreview] = useState<PreviewAttachment | null>(null);

  const filtered = filter === "all" ? docs : docs.filter((d) => d.category === filter);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFile) return;
    await upload.mutateAsync({
      buildingId, file: pendingFile, category,
      title: title || undefined, description: description || undefined,
      documentDate: docDate || undefined,
    });
    setPendingFile(null); setTitle(""); setDescription(""); setDocDate("");
  };

  const onDownload = async (filePath: string, fileName: string) => {
    try {
      const url = await getBuildingDocumentSignedUrl(filePath);
      const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const onZipAll = async () => {
    setZipping(true);
    try {
      const blob = await downloadAllBuildingDocumentsAsZip(buildingId, buildingLabel || "edificio");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${(buildingLabel || "edificio").replace(/[^\w-]+/g, "_")}_documentos.zip`;
      a.click(); URL.revokeObjectURL(url);
      toast({ title: "ZIP gerado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-medium flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /> Carregar documento</h4>
          <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Ficheiro</Label>
              <Input type="file" onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data do documento</Label>
              <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Título (opcional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto: nome do ficheiro" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={!pendingFile || upload.isPending}>
                <Upload className="h-4 w-4 mr-1" /> {upload.isPending ? "A enviar…" : "Carregar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onZipAll} disabled={zipping || docs.length === 0}>
          <Archive className="h-4 w-4 mr-1" /> {zipping ? "A gerar ZIP…" : "Backup tudo (ZIP)"}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Sem documentos nesta categoria.</p>
      )}

      <div className="space-y-2">
        {filtered.map((d) => {
          const cat = DOCUMENT_CATEGORIES.find((c) => c.value === d.category);
          return (
            <div key={d.id} className="flex items-center justify-between gap-2 border rounded-md p-3 hover:bg-muted/30">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.title}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                    <Badge variant="secondary" className="text-[10px]">{cat?.label ?? d.category}</Badge>
                    <span>{d.file_name}</span>
                    {d.file_size && <span>· {(Number(d.file_size) / 1024).toFixed(0)} KB</span>}
                    <span>· {format(new Date(d.created_at), "dd/MM/yyyy", { locale: pt })}</span>
                  </div>
                  {d.description && <div className="text-xs text-muted-foreground mt-0.5 italic">{d.description}</div>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPreview({ filePath: d.file_path, fileName: d.file_name, mimeType: d.mime_type })}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onDownload(d.file_path, d.file_name)}><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate({ id: d.id, buildingId, filePath: d.file_path })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <AttachmentPreviewDialog
        attachment={preview}
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        bucket="building-documents"
      />
    </div>
  );
}
