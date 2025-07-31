import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateAndSendMagicCode } from "@/utils/magicCodeGenerator";
import { TestTube, ExternalLink } from "lucide-react";

interface TestPortalButtonProps {
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
}

export default function TestPortalButton({ supplierId, supplierName, supplierEmail }: TestPortalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTestPortal = async () => {
    setIsLoading(true);
    try {
      // First, create a test assistance if none exists
      const { data: existingAssistances } = await supabase
        .from("assistances")
        .select("id")
        .eq("assigned_supplier_id", supplierId)
        .limit(1);

      let assistanceId: string | undefined;

      if (!existingAssistances || existingAssistances.length === 0) {
        // Get first building and intervention type for test
        const { data: buildings } = await supabase
          .from("buildings")
          .select("id")
          .eq("is_active", true)
          .limit(1);

        const { data: interventionTypes } = await supabase
          .from("intervention_types")
          .select("id")
          .limit(1);

        if (!buildings || !interventionTypes || buildings.length === 0 || interventionTypes.length === 0) {
          throw new Error("Necessário ter pelo menos um edifício e tipo de intervenção ativos");
        }

        // Create test assistance
        const { data: newAssistance, error } = await supabase
          .from("assistances")
          .insert({
            title: `Teste Portal - ${supplierName}`,
            description: "Assistência criada automaticamente para teste do portal do fornecedor",
            building_id: buildings[0].id,
            intervention_type_id: interventionTypes[0].id,
            assigned_supplier_id: supplierId,
            status: "pending",
            priority: "normal"
          })
          .select("id")
          .single();

        if (error) throw error;
        assistanceId = newAssistance.id;
      } else {
        assistanceId = existingAssistances[0].id;
      }

      // Generate and send magic code
      const { code } = await generateAndSendMagicCode(supplierId, assistanceId);

      // Create portal URL
      const portalUrl = `${window.location.origin}/supplier-portal?code=${code}`;

      toast({
        title: "Portal testado com sucesso!",
        description: `Código gerado: ${code}. Verifique o email do fornecedor.`,
      });

      // Open portal in new tab
      window.open(portalUrl, '_blank');

    } catch (error: any) {
      console.error("Erro ao testar portal:", error);
      toast({
        title: "Erro ao testar portal",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTestPortal}
      disabled={isLoading || !supplierEmail}
      size="sm"
      variant="outline"
      className="flex-1 hover:bg-muted/50"
    >
      {isLoading ? (
        <>
          <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Testando...
        </>
      ) : (
        <>
          <TestTube className="h-3 w-3 mr-1" />
          Testar Portal
        </>
      )}
    </Button>
  );
}