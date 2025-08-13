
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Building, Mail } from "lucide-react";
import { useProblematicAssistances, useFixProblematicAssistance } from "@/hooks/useProblematicAssistances";

export default function ProblematicAssistancesList() {
  const { data: problematicAssistances = [], isLoading } = useProblematicAssistances();
  const fixAssistance = useFixProblematicAssistance();

  const handleFix = async (assistanceId: string) => {
    await fixAssistance.mutateAsync({
      assistanceId,
      action: "remove_quotation_requirement"
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Verificando assistências problemáticas...</div>;
  }

  if (problematicAssistances.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum problema encontrado</h3>
          <p className="text-muted-foreground">
            Todas as assistências com orçamentos solicitados estão configuradas corretamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Assistências Problemáticas ({problematicAssistances.length})
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Estas assistências têm orçamento marcado como solicitado mas não têm fornecedor atribuído.
        </p>
      </div>

      <div className="grid gap-4">
        {problematicAssistances.map((assistance) => (
          <Card key={assistance.id} className="border-l-4 border-l-destructive">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{assistance.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {assistance.buildings?.name}
                  </CardDescription>
                </div>
                <Badge variant="destructive">
                  Configuração Inválida
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Problema identificado:</strong>
                  </div>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Orçamento marcado como solicitado</li>
                    <li>Nenhum fornecedor atribuído</li>
                    <li>Status: {assistance.status}</li>
                    {assistance.quotation_requested_at && (
                      <li>Solicitado em: {new Date(assistance.quotation_requested_at).toLocaleDateString()}</li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleFix(assistance.id)}
                    disabled={fixAssistance.isPending}
                  >
                    {fixAssistance.isPending ? "Corrigindo..." : "Corrigir: Remover Solicitação de Orçamento"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
