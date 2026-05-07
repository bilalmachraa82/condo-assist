import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface KeyHandover {
  id: string;
  building_id: string;
  picked_up_by_name: string;
  picked_up_by_phone: string | null;
  picked_up_at: string;
  returned_by_name: string | null;
  returned_at: string | null;
  purpose: string | null;
  notes: string | null;
  assistance_id: string | null;
  supplier_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  buildings?: { id: string; code: string; name: string } | null;
}

export function useKeyHandovers() {
  return useQuery({
    queryKey: ["key-handovers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("key_handovers")
        .select("*, buildings:building_id (id, code, name)")
        .order("picked_up_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as KeyHandover[];
    },
  });
}

export function useCreateKeyHandover() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<KeyHandover> & { building_id: string; picked_up_by_name: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("key_handovers")
        .insert({ ...(input as any), created_by: u.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["key-handovers"] });
      toast({ title: "Registo de chaves criado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateKeyHandover() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<KeyHandover> & { id: string }) => {
      const { data, error } = await supabase
        .from("key_handovers")
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["key-handovers"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteKeyHandover() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("key_handovers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["key-handovers"] });
      toast({ title: "Registo apagado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
