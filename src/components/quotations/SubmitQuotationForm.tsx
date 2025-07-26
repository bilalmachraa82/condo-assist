import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calculator, Euro, FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const quotationSchema = z.object({
  amount: z.string().min(1, "Valor é obrigatório").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Valor deve ser um número positivo"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  notes: z.string().optional(),
  validity_days: z.string().min(1, "Prazo de validade é obrigatório").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Prazo deve ser um número positivo"),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

interface SubmitQuotationFormProps {
  assistanceId: string;
  supplierId: string;
  onQuotationSubmitted: () => void;
}

export default function SubmitQuotationForm({ assistanceId, supplierId, onQuotationSubmitted }: SubmitQuotationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      amount: "",
      description: "",
      notes: "",
      validity_days: "30",
    },
  });

  const submitQuotationMutation = useMutation({
    mutationFn: async (values: QuotationFormValues) => {
      const { data, error } = await supabase
        .from("quotations")
        .insert({
          assistance_id: assistanceId,
          supplier_id: supplierId,
          amount: Number(values.amount),
          description: values.description,
          notes: values.notes || null,
          validity_days: Number(values.validity_days),
          status: "pending",
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (quotation) => {
      // Log activity
      await supabase
        .from("activity_log")
        .insert({
          assistance_id: assistanceId,
          supplier_id: supplierId,
          action: "quotation_submitted",
          details: `Orçamento submetido no valor de €${quotation.amount}`,
          metadata: {
            quotation_id: quotation.id,
            amount: quotation.amount,
            validity_days: quotation.validity_days
          }
        });

      toast({
        title: "Sucesso",
        description: "Orçamento submetido com sucesso!",
      });

      // Invalidate quotations cache
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["assistance-quotations", assistanceId] });
      
      form.reset();
      onQuotationSubmitted();
    },
    onError: (error: any) => {
      console.error("Quotation submission error:", error);
      toast({
        title: "Erro",
        description: "Erro ao submeter orçamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: QuotationFormValues) => {
    setIsSubmitting(true);
    try {
      await submitQuotationMutation.mutateAsync(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Submeter Orçamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          {...field} 
                          placeholder="0.00"
                          className="pl-10"
                          type="number"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validity_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade (dias)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          {...field} 
                          placeholder="30"
                          className="pl-10"
                          type="number"
                          min="1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Descreva os trabalhos incluídos neste orçamento..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Adicionais (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Condições especiais, garantias, etc..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-primary to-primary-light"
              >
                {isSubmitting ? (
                  "A submeter..."
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Submeter Orçamento
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}