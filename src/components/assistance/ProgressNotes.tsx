import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Clock, FileText, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAssistanceProgress, useCreateAssistanceProgress } from "@/hooks/useAssistanceProgress";

interface ProgressNotesProps {
  assistanceId: string;
}

export default function ProgressNotes({ assistanceId }: ProgressNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const { data: progressEntries = [], isLoading } = useAssistanceProgress(assistanceId);
  const createProgressMutation = useCreateAssistanceProgress();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await createProgressMutation.mutateAsync({
        assistanceId,
        progressType: "comment",
        description: newNote.trim(),
        title: "Nota de Progresso",
      });

      setNewNote("");
      setIsAdding(false);
      toast({
        title: "Sucesso",
        description: "Nota adicionada com sucesso!",
      });
    } catch (error) {
      console.error("Error adding progress note:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar nota. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getProgressTypeLabel = (type: string) => {
    const labels = {
      comment: "Nota",
      photo: "Foto",
      status_update: "Atualização",
      issue: "Problema",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getProgressTypeVariant = (type: string) => {
    const variants = {
      comment: "secondary" as const,
      photo: "default" as const,
      status_update: "default" as const,
      issue: "destructive" as const,
    };
    return variants[type as keyof typeof variants] || "secondary";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notas de Progresso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <p className="text-muted-foreground">Carregando notas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notas de Progresso
          </div>
          {!isAdding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Nota
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isAdding && (
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Escreva uma nota sobre o progresso da assistência..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAdding(false);
                      setNewNote("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || createProgressMutation.isPending}
                  >
                    {createProgressMutation.isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="h-[400px]">
          {progressEntries.length > 0 ? (
            <div className="space-y-3 pr-4">
              {progressEntries.map((entry, index) => (
                <div key={entry.id}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getProgressTypeVariant(entry.progress_type)}>
                            {getProgressTypeLabel(entry.progress_type)}
                          </Badge>
                          {entry.title && (
                            <span className="font-medium text-sm">{entry.title}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                      
                      {entry.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {entry.description}
                        </p>
                      )}

                      {entry.photo_urls && entry.photo_urls.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {entry.photo_urls.map((url, photoIndex) => (
                            <img
                              key={photoIndex}
                              src={url}
                              alt={`Progresso ${photoIndex + 1}`}
                              className="w-16 h-16 object-cover rounded border"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {index < progressEntries.length - 1 && (
                    <div className="ml-1 my-3">
                      <div className="w-px h-4 bg-border" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">Ainda não há notas de progresso</p>
              <p className="text-sm text-muted-foreground">
                Adicione a primeira nota para acompanhar o progresso desta assistência.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}