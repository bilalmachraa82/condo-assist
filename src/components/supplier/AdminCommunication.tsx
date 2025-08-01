import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, User, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminCommunicationProps {
  assistanceId: string;
  supplierId: string;
}

interface CommunicationMessage {
  id: string;
  message: string;
  sender_type: "admin" | "supplier";
  sender_id: string;
  created_at: string;
}

export default function AdminCommunication({ assistanceId, supplierId }: AdminCommunicationProps) {
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch communications for this assistance
  const { data: communications = [], isLoading } = useQuery({
    queryKey: ["communications", assistanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communications_log")
        .select("*")
        .eq("assistance_id", assistanceId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as CommunicationMessage[];
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data, error } = await supabase
        .from("communications_log")
        .insert({
          assistance_id: assistanceId,
          sender_id: supplierId,
          sender_type: "supplier",
          message: message,
          message_type: "general"
        })
        .select()
        .single();

      if (error) {
        console.error("Send message error:", error);
        throw new Error(error.message || "Erro ao enviar mensagem");
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada",
        description: "A sua mensagem foi enviada para o administrador.",
      });
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["communications", assistanceId] });
    },
    onError: (error: any) => {
      console.error("Send message error:", error);
      let errorMessage = "Erro ao enviar mensagem. Tente novamente.";
      
      if (error.message?.includes("row-level security")) {
        errorMessage = "Erro de autenticação. Verifique se tem permissão para enviar mensagens.";
      } else if (error.message?.includes("network")) {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comunicação com Administrador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <ScrollArea className="h-64 border rounded-lg p-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground">
              Carregando mensagens...
            </div>
          ) : communications.length === 0 ? (
            <div className="text-center text-muted-foreground">
              Nenhuma mensagem ainda. Inicie uma conversa com o administrador.
            </div>
          ) : (
            <div className="space-y-3">
              {communications.map((comm) => (
                <div
                  key={comm.id}
                  className={`flex ${comm.sender_type === "supplier" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      comm.sender_type === "supplier"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {comm.sender_type === "supplier" ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <UserCheck className="h-3 w-3" />
                      )}
                      <Badge variant={comm.sender_type === "supplier" ? "secondary" : "outline"} className="text-xs">
                        {comm.sender_type === "supplier" ? "Você" : "Admin"}
                      </Badge>
                    </div>
                    <p className="text-sm">{comm.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {formatDate(comm.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Send Message */}
        <div className="space-y-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem para o administrador..."
            rows={3}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendMessageMutation.isPending ? "Enviando..." : "Enviar Mensagem"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}