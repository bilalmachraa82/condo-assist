import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Camera, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText
} from "lucide-react";
import { useAssistanceProgress, useCreateAssistanceProgress } from "@/hooks/useAssistanceProgress";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface ProgressTrackerProps {
  assistanceId: string;
  supplierId: string;
  currentStatus: string;
}

export default function ProgressTracker({ 
  assistanceId, 
  supplierId, 
  currentStatus 
}: ProgressTrackerProps) {
  const [progressType, setProgressType] = useState<"comment" | "photo" | "issue">("comment");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const { data: progressData = [], isLoading } = useAssistanceProgress(assistanceId);
  const createProgress = useCreateAssistanceProgress();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, adicione uma descrição.",
        variant: "destructive",
      });
      return;
    }

    try {
      let photoUrls: string[] = [];
      
      // Upload photos if any are selected
      if (photoFiles.length > 0) {
        for (const file of photoFiles) {
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          const { data, error } = await supabase.functions.invoke('upload-assistance-photo', {
            body: {
              assistanceId,
              photoType: progressType,
              caption: title || 'Progress photo',
              file: {
                name: file.name,
                type: file.type,
                data: base64Data.split(',')[1], // Remove data:image/xxx;base64, prefix
              }
            }
          });

          if (error) throw error;
          if (data?.photo?.file_url) {
            photoUrls.push(data.photo.file_url);
          }
        }
      }

      await createProgress.mutateAsync({
        assistanceId,
        supplierId,
        progressType,
        title: title || undefined,
        description,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined
      });

      // Reset form
      setTitle("");
      setDescription("");
      setPhotoFiles([]);
      
      toast({
        title: "Sucesso",
        description: "Progresso registado com sucesso",
      });
    } catch (error) {
      console.error('Error creating progress:', error);
      toast({
        title: "Erro",
        description: "Erro ao registar progresso",
        variant: "destructive",
      });
    }
  };

  const getProgressIcon = (type: string) => {
    switch (type) {
      case "comment": return MessageSquare;
      case "photo": return Camera;
      case "issue": return AlertTriangle;
      case "status_update": return CheckCircle;
      default: return FileText;
    }
  };

  const getProgressBadge = (type: string) => {
    const variants = {
      comment: { variant: "secondary" as const, text: "Comentário" },
      photo: { variant: "default" as const, text: "Foto" },
      issue: { variant: "destructive" as const, text: "Problema" },
      status_update: { variant: "outline" as const, text: "Status" },
    };
    
    const config = variants[type as keyof typeof variants] || variants.comment;
    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Form */}
      <Card>
        <CardHeader>
          <CardTitle>Registar Progresso</CardTitle>
          <CardDescription>
            Adicione atualizações sobre o progresso da assistência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tipo de Registo</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={progressType === "comment" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProgressType("comment")}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Comentário
                </Button>
                <Button
                  type="button"
                  variant={progressType === "photo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProgressType("photo")}
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Foto
                </Button>
                <Button
                  type="button"
                  variant={progressType === "issue" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProgressType("issue")}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Problema
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Título (opcional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do registo"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o progresso, problema ou comentário..."
                rows={3}
                required
              />
            </div>

            {progressType === "photo" && (
              <div>
                <Label htmlFor="photos">Fotos</Label>
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
                />
                {photoFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {photoFiles.length} foto(s) selecionada(s)
                  </p>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={createProgress.isPending}
              className="w-full"
            >
              {createProgress.isPending ? "A registar..." : "Registar Progresso"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Progress History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Progresso</CardTitle>
          <CardDescription>
            Todas as atualizações registadas para esta assistência
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progressData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ainda não há registos de progresso.</p>
              <p className="text-sm">Adicione o primeiro registo acima.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {progressData.map((progress, index) => {
                const Icon = getProgressIcon(progress.progress_type);
                return (
                  <div key={progress.id} className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {progress.title && (
                              <h4 className="font-medium">{progress.title}</h4>
                            )}
                            {getProgressBadge(progress.progress_type)}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(progress.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {progress.description}
                        </p>
                        {progress.photo_urls && progress.photo_urls.length > 0 && (
                          <div className="flex gap-2">
                            {progress.photo_urls.map((url, photoIndex) => (
                              <img 
                                key={photoIndex}
                                src={url}
                                alt={`Progress photo ${photoIndex + 1}`}
                                className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(url, '_blank')}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {index < progressData.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}