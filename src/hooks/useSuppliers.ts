import { useQuery } from "@tanstack/react-query";
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