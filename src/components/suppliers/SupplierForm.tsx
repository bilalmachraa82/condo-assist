import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useCreateSupplier, useUpdateSupplier, type Supplier } from "@/hooks/useSuppliers"
import { useToast } from "@/hooks/use-toast"

const supplierSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  nif: z.string().optional(),
  specialization: z.string().optional(),
  admin_notes: z.string().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  total_jobs: z.coerce.number().min(0).optional(),
  is_active: z.boolean().default(true),
})

type SupplierFormData = z.infer<typeof supplierSchema>

interface SupplierFormProps {
  supplier?: Supplier
  onSuccess?: () => void
  onCancel?: () => void
}

export function SupplierForm({ supplier, onSuccess, onCancel }: SupplierFormProps) {
  const { toast } = useToast()
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name || "",
      email: supplier?.email || "",
      phone: supplier?.phone || "",
      address: supplier?.address || "",
      nif: supplier?.nif || "",
      specialization: supplier?.specialization || "",
      admin_notes: supplier?.admin_notes || "",
      rating: supplier?.rating ? Number(supplier.rating) : undefined,
      total_jobs: supplier?.total_jobs || 0,
      is_active: supplier?.is_active ?? true,
    },
  })

  const onSubmit = async (data: SupplierFormData) => {
    try {
      const processedData = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        nif: data.nif || null,
        specialization: data.specialization || null,
        admin_notes: data.admin_notes || null,
        rating: data.rating || null,
        total_jobs: data.total_jobs || 0,
        is_active: data.is_active,
      }

      if (supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, ...processedData })
        toast({ title: "Fornecedor atualizado com sucesso!" })
      } else {
        await createSupplier.mutateAsync(processedData)
        toast({ title: "Fornecedor criado com sucesso!" })
      }
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Erro",
        description: supplier ? "Erro ao atualizar fornecedor" : "Erro ao criar fornecedor",
        variant: "destructive",
      })
    }
  }

  const isLoading = createSupplier.isPending || updateSupplier.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do fornecedor" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="+351 123 456 789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nif"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIF</FormLabel>
                <FormControl>
                  <Input placeholder="123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Especialização</FormLabel>
                <FormControl>
                  <Input placeholder="ex: Eletricidade, Canalização" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avaliação (0-5)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="5" step="0.1" placeholder="4.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="total_jobs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total de Trabalhos</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Textarea placeholder="Endereço completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="admin_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Administrativas</FormLabel>
              <FormControl>
                <Textarea placeholder="Notas internas..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ativo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Define se o fornecedor está ativo no sistema
                </div>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {supplier ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  )
}