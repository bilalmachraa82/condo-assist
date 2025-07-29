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
import { Euro, Calendar, FileText, Plus, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface EnhancedQuotationFormProps {
  assistanceId: string;
  supplierId: string;
  onQuotationSubmitted: () => void;
}

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function EnhancedQuotationForm({ 
  assistanceId, 
  supplierId, 
  onQuotationSubmitted 
}: EnhancedQuotationFormProps) {
  const [items, setItems] = useState<QuotationItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [laborCost, setLaborCost] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const materialTotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = materialTotal + laborCost;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const quotationData = {
        assistance_id: assistanceId,
        supplier_id: supplierId,
        amount: totalAmount,
        description: description,
        notes: notes,
        validity_days: validityDays,
        submitted_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("quotations")
        .insert(quotationData)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase
        .from("activity_log")
        .insert({
          assistance_id: assistanceId,
          supplier_id: supplierId,
          action: "quotation_submitted",
          details: `Orçamento submetido no valor de €${totalAmount.toFixed(2)}`,
          metadata: {
            amount: totalAmount,
            items: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total
            })),
            labor_cost: laborCost,
            validity_days: validityDays
          }
        });

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Orçamento submetido",
        description: "O seu orçamento foi submetido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-assistances"] });
      onQuotationSubmitted();
    },
    onError: (error: any) => {
      console.error("Submit quotation error:", error);
      toast({
        title: "Erro",
        description: "Erro ao submeter orçamento. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, adicione uma descrição ao orçamento.",
        variant: "destructive",
      });
      return;
    }

    if (totalAmount <= 0) {
      toast({
        title: "Erro",
        description: "O valor total deve ser superior a zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Submeter Orçamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição Geral do Trabalho *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o trabalho a realizar..."
              rows={3}
              required
            />
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Materiais e Serviços</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Item {index + 1}</span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Label>Descrição</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Ex: Tinta branca 15L"
                    />
                  </div>
                  <div>
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Preço Unitário (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-medium">
                    Subtotal: €{item.total.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Labor Cost */}
          <div className="space-y-2">
            <Label htmlFor="laborCost">Custo de Mão de Obra (€)</Label>
            <Input
              id="laborCost"
              type="number"
              min="0"
              step="0.01"
              value={laborCost}
              onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span>Materiais:</span>
              <span>€{materialTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Mão de Obra:</span>
              <span>€{laborCost.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>€{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Validity */}
          <div className="space-y-2">
            <Label htmlFor="validity">Validade do Orçamento</Label>
            <Select value={validityDays.toString()} onValueChange={(value) => setValidityDays(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="45">45 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações Adicionais</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condições especiais, garantias, prazos de execução..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isSubmitting || totalAmount <= 0}
            className="w-full"
            size="lg"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isSubmitting ? "A submeter..." : `Submeter Orçamento (€${totalAmount.toFixed(2)})`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}