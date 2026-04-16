import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AssemblyItem {
  id: string;
  building_code: number;
  building_address: string | null;
  building_id: string | null;
  year: number;
  description: string;
  status: string;
  status_notes: string | null;
  category: string | null;
  priority: string;
  assigned_to: string | null;
  estimated_cost: number | null;
  resolution_date: string | null;
  source_sheet: string | null;
  knowledge_article_id: string | null;
  created_at: string;
  updated_at: string;
  buildings?: { id: string; code: string; name: string } | null;
}

export interface AssemblyFilters {
  search?: string;
  status?: string;
  category?: string;
  building_id?: string;
  year?: number;
  limit?: number;
  page?: number;
}

export const useAssemblyItems = (filters: AssemblyFilters = {}) => {
  const limit = filters.limit || 50;
  const page = filters.page || 0;
  const from = page * limit;
  const to = from + limit - 1;

  return useQuery({
    queryKey: ["assembly-items", filters],
    queryFn: async () => {
      let query = supabase
        .from("assembly_items")
        .select("*, buildings(id, code, name)", { count: "exact" })
        .order("building_code", { ascending: true })
        .order("created_at", { ascending: true })
        .range(from, to);

      if (filters.status) query = query.eq("status", filters.status);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.year) query = query.eq("year", filters.year);
      if (filters.building_id) query = query.eq("building_id", filters.building_id);
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,building_address.ilike.%${filters.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { items: (data as unknown as AssemblyItem[]) ?? [], count: count ?? 0 };
    },
  });
};

export const useAssemblyStatusCounts = () => {
  return useQuery({
    queryKey: ["assembly-status-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assembly_items")
        .select("status, category");
      if (error) throw error;

      const statusCounts: Record<string, number> = { pending: 0, in_progress: 0, done: 0, cancelled: 0 };
      const categoryCounts: Record<string, number> = {};
      for (const row of data) {
        statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
        if (row.category) {
          categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
        }
      }
      return { statusCounts, categoryCounts, total: data.length };
    },
  });
};

export const useUpdateAssemblyItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AssemblyItem> & { id: string }) => {
      const { buildings: _b, ...rest } = updates;
      const { data, error } = await supabase
        .from("assembly_items")
        .update(rest as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assembly-items"] });
      queryClient.invalidateQueries({ queryKey: ["assembly-status-counts"] });
      toast({ title: "Atualizado", description: "Assunto atualizado com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useCreateAssemblyItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<AssemblyItem, "id" | "created_at" | "updated_at" | "buildings" | "knowledge_article_id" | "source_sheet">) => {
      const { data, error } = await supabase
        .from("assembly_items")
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assembly-items"] });
      queryClient.invalidateQueries({ queryKey: ["assembly-status-counts"] });
      toast({ title: "Criado", description: "Assunto criado com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteAssemblyItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assembly_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assembly-items"] });
      queryClient.invalidateQueries({ queryKey: ["assembly-status-counts"] });
      toast({ title: "Eliminado", description: "Assunto eliminado." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};
