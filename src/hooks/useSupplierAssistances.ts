import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SupplierAssistance {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  building_name: string;
  intervention_type: string;
}

export const useSupplierAssistances = (supplierId: string) => {
  return useQuery({
    queryKey: ["supplier-assistances", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistances")
        .select(`
          id,
          title,
          description,
          priority,
          status,
          created_at,
          buildings!inner(name),
          intervention_types!inner(name)
        `)
        .eq("assigned_supplier_id", supplierId)
        .in("status", ["pending", "awaiting_quotation", "quotation_received", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((assistance): SupplierAssistance => ({
        id: assistance.id,
        title: assistance.title,
        description: assistance.description || "",
        priority: assistance.priority,
        status: assistance.status,
        created_at: assistance.created_at,
        building_name: assistance.buildings?.name || "",
        intervention_type: assistance.intervention_types?.name || "",
      }));
    },
    enabled: !!supplierId,
  });
};