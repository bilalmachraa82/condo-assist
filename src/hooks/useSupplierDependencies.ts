import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SupplierDependencies = {
  can_delete: boolean;
  dependencies: {
    email_logs: number;
    assistances: number;
    quotations: number;
    supplier_responses: number;
    magic_codes: number;
    activity_logs: number;
  };
  has_critical_data: boolean;
  total_records: number;
};

export const useSupplierDependencies = (supplierId: string) => {
  return useQuery({
    queryKey: ["supplier-dependencies", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_supplier_dependencies", {
        p_supplier_id: supplierId,
      });

      if (error) throw error;
      return data as SupplierDependencies;
    },
    enabled: !!supplierId,
  });
};

export const useDeactivateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierId: string) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update({ is_active: false })
        .eq("id", supplierId)
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

export const useForceDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierId: string) => {
      // Use the secure RPC function to purge non-critical data
      const { data, error: purgeError } = await supabase.rpc("purge_supplier_non_critical", {
        p_supplier_id: supplierId,
      });

      if (purgeError) throw purgeError;

      // Then deactivate the supplier (preserving critical audit data)
      const { error } = await supabase
        .from("suppliers")
        .update({ is_active: false })
        .eq("id", supplierId);

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