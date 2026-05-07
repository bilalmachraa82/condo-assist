import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ExternalLink, FileText } from "lucide-react";
import { getPendencyFileSignedUrl } from "@/hooks/usePendencies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PreviewAttachment {
  filePath: string;
  fileName: string;
  mimeType?: string | null;
}

interface Props {
  attachment: PreviewAttachment | null;
  onOpenChange: (open: boolean) => void;
  /** Optional storage bucket; defaults to email-pendencies via legacy helper */
  bucket?: string;
  open?: boolean;
}

export default function AttachmentPreviewDialog({ attachment, onOpenChange, bucket }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!attachment) return;
    let revoked: string | null = null;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setBlobUrl(null);
      try {
        let signed: string;
        if (bucket) {
          const { data, error } = await supabase.storage.from(bucket).createSignedUrl(attachment.filePath, 3600);
          if (error) throw error;
          signed = data.signedUrl;
        } else {
          signed = await getPendencyFileSignedUrl(attachment.filePath);
        }
        const res = await fetch(signed);
        if (!res.ok) throw new Error("Falha a descarregar o ficheiro");
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      } catch (e: any) {
        console.error("Erro a abrir anexo:", e);
        toast({
          title: "Não foi possível abrir o anexo",
          description: e?.message ?? "Tenta novamente.",
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [attachment?.filePath]);

  const open = !!attachment;
  const mime = attachment?.mimeType?.toLowerCase() ?? "";
  const name = attachment?.fileName ?? "";
  const isPdf = mime.includes("pdf") || name.toLowerCase().endsWith(".pdf");
  const isImage = mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0 gap-2">
          <DialogTitle className="text-base font-medium truncate flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{name}</span>
          </DialogTitle>
          <div className="flex items-center gap-1 shrink-0 mr-6">
            {blobUrl && (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <a href={blobUrl} target="_blank" rel="noopener noreferrer" title="Abrir em nova janela">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={blobUrl} download={name} title="Descarregar">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30 overflow-auto">
          {loading && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && blobUrl && isPdf && (
            <iframe src={blobUrl} title={name} className="w-full h-full border-0" />
          )}
          {!loading && blobUrl && isImage && (
            <div className="h-full flex items-center justify-center p-4">
              <img src={blobUrl} alt={name} className="max-h-full max-w-full object-contain" />
            </div>
          )}
          {!loading && blobUrl && !isPdf && !isImage && (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                Pré-visualização não disponível para este tipo de ficheiro.
              </div>
              <Button asChild>
                <a href={blobUrl} download={name}>
                  <Download className="h-4 w-4 mr-2" /> Descarregar
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
