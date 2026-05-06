import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type InsuranceStatus = "ok" | "due_soon_30" | "overdue" | "missing";
export type CoverageType = "multirisco" | "partes_comuns" | "acidentes_trabalho" | "outro";

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
  acidentes_trabalho: "Acidentes de Trabalho",
  outro: "Outro",
};

// ===== Frações por edifício + estado por apólice =====

export interface BuildingFraction {
  id: string;
  building_id: string;
  label: string;
  permillage: number | null;
  notes: string | null;
  display_order: number;
}

export function useBuildingFractions(buildingId?: string) {
  return useQuery({
    queryKey: ["building-fractions", buildingId],
    enabled: !!buildingId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("building_fractions")
        .select("*")
        .eq("building_id", buildingId)
        .order("display_order")
        .order("label");
      if (error) throw error;
      return (data ?? []) as BuildingFraction[];
    },
  });
}

export function useUpsertBuildingFraction() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<BuildingFraction> & { building_id: string; label: string }) => {
      const payload: any = { ...input };
      if (payload.id) {
        const { id, ...rest } = payload;
        const { data, error } = await (supabase as any)
          .from("building_fractions").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any)
        .from("building_fractions").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["building-fractions", vars.building_id] });
      toast({ title: "Fração guardada" });
    },
  });
}

export function useDeleteBuildingFraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; building_id: string }) => {
      const { error } = await (supabase as any).from("building_fractions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["building-fractions", vars.building_id] });
    },
  });
}

export type FractionStatusValue = "included" | "excluded";

export interface InsuranceFractionStatus {
  id: string;
  insurance_id: string;
  fraction_id: string;
  status: FractionStatusValue;
  notes: string | null;
}

export function useInsuranceFractionStatus(insuranceId?: string | null) {
  return useQuery({
    queryKey: ["insurance-fraction-status", insuranceId],
    enabled: !!insuranceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("insurance_fraction_status")
        .select("*")
        .eq("insurance_id", insuranceId);
      if (error) throw error;
      return (data ?? []) as InsuranceFractionStatus[];
    },
  });
}

export function useSaveInsuranceFractionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      insurance_id: string;
      entries: { fraction_id: string; status: FractionStatusValue }[];
    }) => {
      // Estratégia simples: apaga tudo e re-insere.
      await (supabase as any)
        .from("insurance_fraction_status")
        .delete()
        .eq("insurance_id", input.insurance_id);
      if (input.entries.length === 0) return;
      const rows = input.entries.map((e) => ({
        insurance_id: input.insurance_id,
        fraction_id: e.fraction_id,
        status: e.status,
      }));
      const { error } = await (supabase as any).from("insurance_fraction_status").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["insurance-fraction-status", vars.insurance_id] });
    },
  });
}
