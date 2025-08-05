import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Assistance } from "./useAssistances";

export const useAssistancesBySupplier = (supplierId: string) => {
  return useQuery({
    queryKey: ["assistances-by-supplier", supplierId],
    queryFn: async (): Promise<Assistance[]> => {
      if (!supplierId) return [];
      
      const { data, error } = await supabase
        .from("assistances")
        .select(`
          *,
          buildings (
            *
          ),
          suppliers (
            *
          ),
          intervention_types (
            *
          )
        `)
        .eq("assigned_supplier_id", supplierId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!supplierId,
  });
};