import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Tables } from "@/integrations/supabase/types"
import { useAuth } from "@/hooks/useAuth"
import React from "react"

const profileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>
type Profile = Tables<"profiles">

export function ProfileForm() {
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (error) throw error
      return data as Profile | null
    },
    enabled: !!user?.id,
  })

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!user?.id) throw new Error("User not found")

      const { data: result, error } = await supabase
        .from("profiles")
        .update(data)
        .eq("user_id", user.id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] })
      toast({ title: "Perfil atualizado com sucesso!" })
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil",
        variant: "destructive",
      })
    },
  })

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
    },
  })

  // Update form when profile data loads
  React.useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
      })
    }
  }, [profile, form])

  const onSubmit = async (data: ProfileFormData) => {
    await updateProfile.mutateAsync(data)
  }

  if (isLoading) {
    return <div>Carregando...</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primeiro Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Primeiro nome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Último Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Último nome" {...field} />
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
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateProfile.isPending}>
            Atualizar Perfil
          </Button>
        </div>
      </form>
    </Form>
  )
}