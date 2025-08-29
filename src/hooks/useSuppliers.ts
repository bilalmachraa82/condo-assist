import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Supplier = Tables<"suppliers">;

// Basic supplier data returned by the secure function
export type BasicSupplier = {
  id: string;
  name: string;
  specialization: string | null;
  is_active: boolean;
  rating: number | null;
  total_jobs: number | null;
};

export const useSuppliers = () => {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      // Use the secure function for basic supplier data
      const { data, error } = await supabase.rpc("get_basic_suppliers");

      if (error) throw error;
      return data as BasicSupplier[];
    },
  });
};

export const useAllSuppliers = () => {
  return useQuery({
    queryKey: ["all-suppliers"],
    queryFn: async () => {
      // Admin-only access to full supplier data
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Supplier[];
    },
  });
};

export const useSupplierStats = () => {
  return useQuery({
    queryKey: ["supplier-stats"],
    queryFn: async () => {
      // Get basic supplier data using secure function
      const { data: suppliers, error } = await supabase.rpc("get_basic_suppliers");
      
      if (error) throw error;

      const total = suppliers?.length || 0;
      const active = suppliers?.filter(s => s.is_active)?.length || 0;
      const uniqueSpecializations = new Set(
        suppliers?.map(s => s.specialization).filter(Boolean)
      ).size;

      return {
        total,
        active,
        specializations: uniqueSpecializations,
      };
    },
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (supplier: Omit<Supplier, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("suppliers")
        .insert(supplier)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["all-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-stats"] });
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["all-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-stats"] });
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["all-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-stats"] });
    },
  });
};

export const useSupplier = (id: string) => {
  return useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Supplier | null;
    },
    enabled: !!id,
  });
};