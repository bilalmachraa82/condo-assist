import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Supplier = Tables<"suppliers">;

export const useSuppliers = () => {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Supplier[];
    },
  });
};

export const useAllSuppliers = () => {
  return useQuery({
    queryKey: ["all-suppliers"],
    queryFn: async () => {
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
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from("suppliers")
        .select("*", { count: "exact", head: true });

      if (totalError) throw totalError;

      // Get active count
      const { count: activeCount, error: activeError } = await supabase
        .from("suppliers")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (activeError) throw activeError;

      // Get unique specializations
      const { data: specializationData, error: specializationError } = await supabase
        .from("suppliers")
        .select("specialization")
        .not("specialization", "is", null);

      if (specializationError) throw specializationError;

      const uniqueSpecializations = new Set(
        specializationData?.map(s => s.specialization).filter(Boolean)
      ).size;

      // Calculate average rating
      const { data: ratingData, error: ratingError } = await supabase
        .from("suppliers")
        .select("rating")
        .not("rating", "is", null);

      if (ratingError) throw ratingError;

      const ratings = ratingData?.map(s => Number(s.rating)).filter(r => r > 0) || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;

      return {
        total: totalCount || 0,
        active: activeCount || 0,
        specializations: uniqueSpecializations,
        averageRating: Math.round(averageRating * 10) / 10,
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