import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Plus, Send, User, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useCommunicationLog, useCreateCommunication } from "@/hooks/useCommunicationLog";

interface CommunicationLogProps {
  assistanceId: string;
  userRole?: 'admin' | 'supplier'; // Fixed type annotation
  userId?: string;
}

export default function CommunicationLog({ 
  assistanceId, 
  userRole = 'admin',
  userId 
}: CommunicationLogProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const { data: communications = [], isLoading } = useCommunicationLog(assistanceId);
  const createCommunicationMutation = useCreateCommunication();

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await createCommunicationMutation.mutateAsync({
        assistanceId,
        message: newMessage.trim(),
        senderType: userRole,
        senderId: userId,
        messageType: 'communication',
      });

      setNewMessage("");
      setIsAdding(false);
      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso!",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comunicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <p className="text-muted-foreground">Carregando comunicações...</p>
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
            <MessageSquare className="h-5 w-5" />
            Comunicação
            <Badge variant="outline" className="text-xs">
              {communications.length} mensagem{communications.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {!isAdding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova Mensagem
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isAdding && (
          <Card className="border-dashed border-primary/30">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Escreva uma mensagem para comunicar sobre esta assistência..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAdding(false);
                      setNewMessage("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || createCommunicationMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {createCommunicationMutation.isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="h-[400px]">
          {communications.length > 0 ? (
            <div className="space-y-4 pr-4">
              {communications.map((communication) => (
                <div
                  key={communication.id}
                  className={`flex gap-3 ${
                    communication.sender_type === 'admin' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={
                      communication.sender_type === 'admin' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }>
                      {communication.sender_type === 'admin' ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div 
                    className={`flex-1 max-w-[80%] ${
                      communication.sender_type === 'admin' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant={communication.sender_type === 'admin' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {communication.sender_type === 'admin' ? 'Administrador' : 'Fornecedor'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(communication.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    
                    <div 
                      className={`p-3 rounded-lg ${
                        communication.sender_type === 'admin'
                          ? 'bg-blue-100 border border-blue-200'
                          : 'bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {communication.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">Ainda não há comunicações</p>
              <p className="text-sm text-muted-foreground">
                Inicie uma conversa para comunicar sobre esta assistência.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}