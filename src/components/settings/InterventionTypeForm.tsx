import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useCreateInterventionType, useUpdateInterventionType, InterventionType } from "@/hooks/useInterventionTypes";

const interventionTypeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().optional(),
  description: z.string().optional(),
  urgency_level: z.enum(["normal", "urgent", "critical"]),
});

type InterventionTypeFormData = z.infer<typeof interventionTypeSchema>;

interface InterventionTypeFormProps {
  interventionType?: InterventionType;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InterventionTypeForm({ interventionType, onSuccess, onCancel }: InterventionTypeFormProps) {
  const { toast } = useToast();
  const createMutation = useCreateInterventionType();
  const updateMutation = useUpdateInterventionType();
  
  const form = useForm<InterventionTypeFormData>({
    resolver: zodResolver(interventionTypeSchema),
    defaultValues: {
      name: interventionType?.name || "",
      category: interventionType?.category || "",
      description: interventionType?.description || "",
      urgency_level: interventionType?.urgency_level || "normal",
    },
  });

  const onSubmit = async (data: InterventionTypeFormData) => {
    try {
      if (interventionType) {
        await updateMutation.mutateAsync({ id: interventionType.id, ...data });
        toast({
          title: "Sucesso",
          description: "Tipo de intervenção atualizado com sucesso.",
        });
      } else {
        await createMutation.mutateAsync(data as Omit<InterventionType, "id" | "created_at">);
        toast({
          title: "Sucesso",
          description: "Tipo de intervenção criado com sucesso.",
        });
      }
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar tipo de intervenção.",
        variant: "destructive",
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome do tipo de intervenção" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl>
                <Input placeholder="Categoria (opcional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descrição do tipo de intervenção (opcional)" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="urgency_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nível de Urgência</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível de urgência" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvando..." : interventionType ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}