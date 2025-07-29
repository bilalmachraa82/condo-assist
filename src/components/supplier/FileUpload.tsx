import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Image, X } from "lucide-react";

interface FileUploadProps {
  assistanceId: string;
  supplierId: string;
}

export default function FileUpload({ assistanceId, supplierId }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [photoType, setPhotoType] = useState<"before" | "during" | "after" | "other">("during");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${assistanceId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assistance-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assistance-photos')
        .getPublicUrl(fileName);

      // Save to database
      const { data: photoData, error: photoError } = await supabase
        .from('assistance_photos')
        .insert({
          assistance_id: assistanceId,
          file_url: publicUrl,
          photo_type: photoType,
          caption: caption,
          uploaded_by_supplier: supplierId
        })
        .select()
        .single();

      if (photoError) throw photoError;
      return photoData;
    },
    onSuccess: () => {
      toast({
        title: "Ficheiro carregado",
        description: "O ficheiro foi carregado com sucesso.",
      });
      setSelectedFile(null);
      setCaption("");
      queryClient.invalidateQueries({ queryKey: ["assistance-photos"] });
    },
    onError: (error: any) => {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Erro ao carregar o ficheiro. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Ficheiro muito grande",
          description: "O ficheiro deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFile);
    } finally {
      setIsUploading(false);
    }
  };

  const isImage = selectedFile?.type.startsWith('image/');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Carregar Ficheiros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Selecionar Ficheiro</Label>
          <Input
            id="file"
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Formatos aceites: imagens, PDF, DOC, TXT (máx. 10MB)
          </p>
        </div>

        {selectedFile && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isImage ? (
                  <Image className="h-5 w-5 text-primary" />
                ) : (
                  <FileText className="h-5 w-5 text-primary" />
                )}
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoType">Tipo de Ficheiro</Label>
              <Select value={photoType} onValueChange={(value: any) => setPhotoType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Antes do Trabalho</SelectItem>
                  <SelectItem value="during">Durante o Trabalho</SelectItem>
                  <SelectItem value="after">Depois do Trabalho</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Descrição (opcional)</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Adicione uma descrição para este ficheiro..."
                rows={2}
              />
            </div>

            <Button 
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? "A carregar..." : "Carregar Ficheiro"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}