import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertTriangle, Info, Trash2, UserX } from "lucide-react";
import { useSupplierDependencies, useDeactivateSupplier, useForceDeleteSupplier } from "@/hooks/useSupplierDependencies";
import { useDeleteSupplier, type Supplier } from "@/hooks/useSuppliers";
import { useToast } from "@/hooks/use-toast";

interface SafeDeleteSupplierDialogProps {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SafeDeleteSupplierDialog({ 
  supplier, 
  open, 
  onOpenChange 
}: SafeDeleteSupplierDialogProps) {
  const [deleteStrategy, setDeleteStrategy] = useState<"deactivate" | "force" | null>(null);
  const { toast } = useToast();

  const { data: dependencies, isLoading: isLoadingDeps } = useSupplierDependencies(
    supplier?.id || ""
  );

  const deleteSupplier = useDeleteSupplier();
  const deactivateSupplier = useDeactivateSupplier();
  const forceDeleteSupplier = useForceDeleteSupplier();

  useEffect(() => {
    if (open) {
      setDeleteStrategy(null);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!supplier) return;

    try {
      if (deleteStrategy === "deactivate") {
        await deactivateSupplier.mutateAsync(supplier.id);
        toast({
          title: "Fornecedor desativado",
          description: "O fornecedor foi desativado mas os dados foram preservados.",
        });
      } else if (deleteStrategy === "force") {
        await forceDeleteSupplier.mutateAsync(supplier.id);
        toast({
          title: "Fornecedor eliminado",
          description: "O fornecedor e dados não críticos foram eliminados.",
        });
      } else {
        // Safe delete - no dependencies
        await deleteSupplier.mutateAsync(supplier.id);
        toast({
          title: "Fornecedor eliminado",
          description: "O fornecedor foi eliminado com sucesso.",
        });
      }
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar a operação",
        variant: "destructive",
      });
    }
  };

  const isProcessing = deleteSupplier.isPending || deactivateSupplier.isPending || forceDeleteSupplier.isPending;

  if (!supplier) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {dependencies?.has_critical_data ? (
              <AlertTriangle className="h-5 w-5 text-warning" />
            ) : (
              <Info className="h-5 w-5 text-primary" />
            )}
            Eliminar Fornecedor
          </AlertDialogTitle>
          <AlertDialogDescription>
            Verificando dependências para <strong>{supplier.name}</strong>...
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {isLoadingDeps ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : dependencies ? (
            <>
              {/* Dependencies Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Dados Relacionados:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {dependencies.dependencies.assistances > 0 && (
                    <Badge variant="destructive" className="justify-between">
                      Assistências <span>{dependencies.dependencies.assistances}</span>
                    </Badge>
                  )}
                  {dependencies.dependencies.quotations > 0 && (
                    <Badge variant="destructive" className="justify-between">
                      Orçamentos <span>{dependencies.dependencies.quotations}</span>
                    </Badge>
                  )}
                  {dependencies.dependencies.supplier_responses > 0 && (
                    <Badge variant="destructive" className="justify-between">
                      Respostas <span>{dependencies.dependencies.supplier_responses}</span>
                    </Badge>
                  )}
                  {dependencies.dependencies.email_logs > 0 && (
                    <Badge variant="outline" className="justify-between">
                      Emails <span>{dependencies.dependencies.email_logs}</span>
                    </Badge>
                  )}
                  {dependencies.dependencies.magic_codes > 0 && (
                    <Badge variant="outline" className="justify-between">
                      Códigos <span>{dependencies.dependencies.magic_codes}</span>
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Action Selection */}
              {dependencies.has_critical_data ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-warning-foreground">
                      <strong>Dados críticos encontrados!</strong> Este fornecedor tem assistências, orçamentos ou respostas associadas que não podem ser eliminadas.
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant={deleteStrategy === "deactivate" ? "default" : "outline"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDeleteStrategy("deactivate")}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Desativar (Recomendado)
                    </Button>
                    <p className="text-xs text-muted-foreground px-2">
                      Preserva todos os dados para auditoria e histórico
                    </p>

                    <Button
                      variant={deleteStrategy === "force" ? "destructive" : "outline"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDeleteStrategy("force")}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Dados Não-Críticos
                    </Button>
                    <p className="text-xs text-muted-foreground px-2">
                      Remove emails e códigos. Mantém assistências e orçamentos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-md">
                  <Info className="h-4 w-4 text-success" />
                  <span className="text-xs text-success-foreground">
                    Seguro para eliminar - sem dados críticos.
                  </span>
                </div>
              )}
            </>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isProcessing || (dependencies?.has_critical_data && !deleteStrategy)}
            className={
              deleteStrategy === "force" 
                ? "bg-destructive hover:bg-destructive/90" 
                : deleteStrategy === "deactivate"
                ? "bg-warning hover:bg-warning/90"
                : "bg-primary hover:bg-primary/90"
            }
          >
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {dependencies?.has_critical_data 
              ? deleteStrategy === "deactivate" 
                ? "Desativar Fornecedor"
                : deleteStrategy === "force"
                ? "Eliminar Dados Não-Críticos"
                : "Escolher Opção"
              : "Eliminar Fornecedor"
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}