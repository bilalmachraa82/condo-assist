import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useCreateBuilding, useUpdateBuilding, type Building } from "@/hooks/useBuildings"
import { useToast } from "@/hooks/use-toast"

const buildingSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  address: z.string().optional(),
  nif: z.string().optional(),
  cadastral_code: z.string().optional(),
  admin_notes: z.string().optional(),
  is_active: z.boolean().default(true),
})

type BuildingFormData = z.infer<typeof buildingSchema>

interface BuildingFormProps {
  building?: Building
  onSuccess?: () => void
  onCancel?: () => void
}

export function BuildingForm({ building, onSuccess, onCancel }: BuildingFormProps) {
  const { toast } = useToast()
  const createBuilding = useCreateBuilding()
  const updateBuilding = useUpdateBuilding()

  const form = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      code: building?.code || "",
      name: building?.name || "",
      address: building?.address || "",
      nif: building?.nif || "",
      cadastral_code: building?.cadastral_code || "",
      admin_notes: building?.admin_notes || "",
      is_active: building?.is_active ?? true,
    },
  })

  const onSubmit = async (data: BuildingFormData) => {
    try {
      const processedData = {
        code: data.code,
        name: data.name,
        address: data.address || null,
        nif: data.nif || null,
        cadastral_code: data.cadastral_code || null,
        admin_notes: data.admin_notes || null,
        is_active: data.is_active,
      }

      if (building) {
        await updateBuilding.mutateAsync({ id: building.id, ...processedData })
        toast({ title: "Edifício atualizado com sucesso!" })
      } else {
        await createBuilding.mutateAsync(processedData)
        toast({ title: "Edifício criado com sucesso!" })
      }
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Erro",
        description: building ? "Erro ao atualizar edifício" : "Erro ao criar edifício",
        variant: "destructive",
      })
    }
  }

  const isLoading = createBuilding.isPending || updateBuilding.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código *</FormLabel>
                <FormControl>
                  <Input placeholder="ex: ED001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do edifício" {...field} />
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
            name="cadastral_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código Cadastral</FormLabel>
                <FormControl>
                  <Input placeholder="Código cadastral" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                  Define se o edifício está ativo no sistema
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
            {building ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  )
}