import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type InsuranceStatus = "ok" | "due_soon_30" | "overdue" | "missing";
export type CoverageType = "multirisco" | "partes_comuns" | "outro";

export interface BuildingInsurance {
  id: string;
  building_id: string;
  policy_number: string | null;
  insurer: string | null;
  broker: string | null;
  contact: string | null;
  coverage_type: CoverageType;
  fractions_included: string | null;
  observations: string | null;
  renewal_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceStatusRow {
  building_id: string;
  building_code: string;
  building_name: string;
  insurance_id: string | null;
  policy_number: string | null;
  insurer: string | null;
  broker: string | null;
  contact: string | null;
  coverage_type: CoverageType | null;
  fractions_included: string | null;
  observations: string | null;
  renewal_date: string | null;
  days_until_renewal: number | null;
  status: InsuranceStatus;
}

export function useInsuranceStatus() {
  return useQuery({
    queryKey: ["insurance_status"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("building_insurance_status")
        .select("*")
        .order("building_code");
      if (error) throw error;
      return data as InsuranceStatusRow[];
    },
  });
}

export function useBuildingInsurances(buildingId?: string) {
  return useQuery({
    queryKey: ["building_insurances", buildingId],
    enabled: !!buildingId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("building_insurances")
        .select("*")
        .eq("building_id", buildingId)
        .order("renewal_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as BuildingInsurance[];
    },
  });
}

export interface InsuranceInput {
  id?: string;
  building_id: string;
  policy_number?: string | null;
  insurer?: string | null;
  broker?: string | null;
  contact?: string | null;
  coverage_type: CoverageType;
  fractions_included?: string | null;
  observations?: string | null;
  renewal_date?: string | null;
}

export function useUpsertInsurance() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: InsuranceInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const payload: any = { ...input, created_by: userData?.user?.id ?? null };
      if (input.id) {
        const { id, ...rest } = payload;
        const { data, error } = await (supabase as any)
          .from("building_insurances")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any)
        .from("building_insurances")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["insurance_status"] });
      qc.invalidateQueries({ queryKey: ["building_insurances"] });
      toast({
        title: vars.id ? "Seguro actualizado" : "Seguro registado",
        description: "Estado e alertas actualizados automaticamente.",
      });
    },
  });
}

export function useDeleteInsurance() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("building_insurances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance_status"] });
      qc.invalidateQueries({ queryKey: ["building_insurances"] });
      toast({ title: "Seguro removido" });
    },
  });
}

export const INSURANCE_STATUS_META: Record<InsuranceStatus, { label: string; color: string; bg: string; border: string }> = {
  ok:          { label: "Em dia",        color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  due_soon_30: { label: "Renova em 30d", color: "text-amber-700 dark:text-amber-300",     bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  overdue:     { label: "Vencido",       color: "text-red-700 dark:text-red-300",         bg: "bg-red-500/10",     border: "border-red-500/40" },
  missing:     { label: "Sem registo",   color: "text-slate-600 dark:text-slate-300",     bg: "bg-slate-500/10",   border: "border-slate-500/30" },
};

export const COVERAGE_LABEL: Record<CoverageType, string> = {
  multirisco: "Multirriscos",
  partes_comuns: "Partes Comuns",
  outro: "Outro",
};
