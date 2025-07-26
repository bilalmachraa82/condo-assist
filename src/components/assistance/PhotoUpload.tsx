import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PhotoUploadProps {
  assistanceId: string;
  onPhotoUploaded: () => void;
}

type PhotoType = 'before' | 'during' | 'after' | 'other';

export default function PhotoUpload({ assistanceId, onPhotoUploaded }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoType, setPhotoType] = useState<PhotoType>('before');
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor selecione apenas ficheiros de imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter menos de 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Convert file to base64
      const base64Data = await convertFileToBase64(selectedFile);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('upload-assistance-photo', {
        body: {
          assistanceId,
          photoType,
          caption: caption.trim() || undefined,
          file: {
            name: selectedFile.name,
            type: selectedFile.type,
            data: base64Data,
          },
        },
      });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message || 'Erro ao fazer upload da foto');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer upload da foto');
      }

      toast({
        title: "Sucesso",
        description: "Foto carregada com sucesso!",
      });

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
      setPhotoType('before');
      
      // Reset file input
      const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Notify parent component
      onPhotoUploaded();

    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload da foto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Adicionar Foto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="photo-type">Tipo de Foto</Label>
            <Select value={photoType} onValueChange={(value: PhotoType) => setPhotoType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Antes</SelectItem>
                <SelectItem value="during">Durante</SelectItem>
                <SelectItem value="after">Depois</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="photo-upload">Selecionar Foto</Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>
        </div>

        {previewUrl && (
          <div className="space-y-2">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg border"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={clearSelection}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="caption">Descrição (opcional)</Label>
          <Textarea
            id="caption"
            placeholder="Descreva a foto..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={isUploading}
            rows={2}
          />
        </div>

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="w-full"
        >
          {isUploading ? (
            "A carregar..."
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Carregar Foto
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}