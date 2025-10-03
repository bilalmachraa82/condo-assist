import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Plus, Lock, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useUpdateAssistance, useAssistance } from "@/hooks/useAssistances";
import type { Assistance } from "@/hooks/useAssistances";

interface InternalNotesProps {
  assistance: Assistance;
  canEdit?: boolean; // Admin only
}

export default function InternalNotes({ assistance, canEdit = false }: InternalNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState(assistance.admin_notes || "");
  const [showSaved, setShowSaved] = useState(false);
  const { toast } = useToast();
  const updateMutation = useUpdateAssistance();
  // Use single assistance query for real-time updates
  const { data: currentAssistance } = useAssistance(assistance.id);
  
  // Sync noteText when assistance data changes
  useEffect(() => {
    setNoteText(currentAssistance?.admin_notes || assistance.admin_notes || "");
  }, [currentAssistance?.admin_notes, assistance.admin_notes]);

  const handleSave = async () => {
    // Validate length
    if (noteText.trim().length > 5000) {
      toast({
        title: "Erro",
        description: "A nota não pode exceder 5000 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: assistance.id,
        admin_notes: noteText.trim() || null,
      });

      setIsEditing(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
      
      toast({
        title: "Sucesso", 
        description: "Nota interna guardada com sucesso!",
      });
    } catch (error) {
      console.error("Error updating internal note:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar nota. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setNoteText(currentAssistance?.admin_notes || assistance.admin_notes || "");
    setIsEditing(false);
  };

  // Check if note has changed
  const hasChanged = noteText.trim() !== (currentAssistance?.admin_notes || assistance.admin_notes || "").trim();

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <span className="text-amber-800">Notas Internas</span>
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
              <Lock className="h-3 w-3 mr-1" />
              Apenas Administradores
            </Badge>
          </div>
          {canEdit && !isEditing && !showSaved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              <Plus className="h-4 w-4 mr-1" />
              {currentAssistance?.admin_notes || assistance.admin_notes ? "Editar" : "Adicionar"}
            </Button>
          )}
          {showSaved && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
              <Check className="h-3 w-3 mr-1" />
              Guardado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!canEdit ? (
          <div className="flex items-center justify-center p-8 text-center">
            <div className="text-muted-foreground">
              <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Acesso restrito a administradores</p>
            </div>
          </div>
        ) : isEditing ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Escreva notas internas sobre esta assistência (não visível para fornecedores)..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              maxLength={5000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {noteText.length}/5000 caracteres
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending || !hasChanged}
                className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                {updateMutation.isPending ? "A guardar..." : "Salvar"}
              </Button>
            </div>
          </div>
        ) : (currentAssistance?.admin_notes || assistance.admin_notes) ? (
          <div className="space-y-3">
            <ScrollArea className="max-h-[300px]">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {currentAssistance?.admin_notes || assistance.admin_notes}
                </p>
              </div>
            </ScrollArea>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-amber-200">
              <Shield className="h-3 w-3" />
              <span>
                Última atualização: {format(new Date(currentAssistance?.updated_at || assistance.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Shield className="h-12 w-12 text-amber-300 mb-4" />
            <p className="text-muted-foreground mb-2">Ainda não há notas internas</p>
            <p className="text-sm text-muted-foreground">
              Adicione notas administrativas que apenas a equipa interna pode ver.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}