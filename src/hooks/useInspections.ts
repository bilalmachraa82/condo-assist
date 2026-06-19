import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type InspectionStatus = "ok" | "due_soon_30" | "due_soon_15" | "overdue" | "missing" | "pending";
export type InspectionResult = "aprovado" | "aprovado_clausulas" | "pendente_relatorio" | "chumbou";

export interface InspectionCategory {
  id: string;
  key: string;
  label: string;
  description: string | null;
  validity_years: number;
  alert_days: number[];
  legal_reference: string | null;
  color: string;
  icon: string;
  is_active: boolean;
  display_order: number;
}

export interface BuildingInspection {
  id: string;
  building_id: string;
  category_id: string;
  inspection_date: string;
  result: InspectionResult;
  next_due_date: string;
  company_name: string | null;
  company_contact: string | null;
  certificate_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionStatusRow {
  building_id: string;
  building_code: string;
  building_name: string;
  category_id: string;
  category_key: string;
  category_label: string;
  category_color: string;
  category_icon: string;
  validity_years: number;
  inspection_id: string | null;
  inspection_date: string | null;
  next_due_date: string | null;
  result: string | null;
  company_name: string | null;
  company_contact: string | null;
  notes: string | null;
  certificate_url: string | null;
  days_until_due: number | null;
  status: InspectionStatus;
}

type InspectionCategoryJoin = Pick<InspectionCategory, "label" | "key" | "color" | "icon" | "validity_years">;

export function useInspectionCategories() {
  return useQuery({
    queryKey: ["inspection_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspection_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as InspectionCategory[];
    },
  });
}

export function useInspectionStatus() {
  return useQuery({
    queryKey: ["inspection_status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_inspection_status")
        .select("*")
        .order("building_code")
        .order("category_label");
      if (error) throw error;
      return data as InspectionStatusRow[];
    },
  });
}

export function useBuildingInspections(buildingId?: string) {
  return useQuery({
    queryKey: ["building_inspections", buildingId],
    enabled: !!buildingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_inspections")
        .select("*, inspection_categories(label, key, color, icon, validity_years)")
        .eq("building_id", buildingId)
        .order("inspection_date", { ascending: false });
      if (error) throw error;
      return data as unknown as (BuildingInspection & { inspection_categories: InspectionCategoryJoin | null })[];
    },
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      building_id: string;
      category_id: string;
      inspection_date: string;
      result: BuildingInspection["result"];
      company_name?: string | null;
      company_contact?: string | null;
      notes?: string | null;
      certificate_url?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const payload = { ...input, created_by: userData?.user?.id ?? null } as TablesInsert<"building_inspections">;
      const { data, error } = await supabase
        .from("building_inspections")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection_status"] });
      qc.invalidateQueries({ queryKey: ["building_inspections"] });
      toast({ title: "Inspeção registada", description: "Próxima data calculada automaticamente." });
    },
  });
}

export function useUpdateInspection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: {
      id: string;
      building_id?: string;
      category_id?: string;
      inspection_date?: string;
      result?: BuildingInspection["result"];
      company_name?: string | null;
      company_contact?: string | null;
      notes?: string | null;
      certificate_url?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("building_inspections")
        .update(patch as TablesUpdate<"building_inspections">)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection_status"] });
      qc.invalidateQueries({ queryKey: ["building_inspections"] });
      toast({ title: "Inspeção atualizada" });
    },
  });
}

export function useDeleteInspection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("building_inspections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection_status"] });
      qc.invalidateQueries({ queryKey: ["building_inspections"] });
      toast({ title: "Inspeção removida" });
    },
  });
}

export const STATUS_META: Record<InspectionStatus, { label: string; color: string; bg: string; border: string }> = {
  ok:          { label: "Em dia",        color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  due_soon_30: { label: "Vencer 30 dias", color: "text-amber-700 dark:text-amber-300",     bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  due_soon_15: { label: "Vencer 15 dias", color: "text-orange-700 dark:text-orange-300",   bg: "bg-orange-500/10",  border: "border-orange-500/30" },
  overdue:     { label: "Vencido",       color: "text-red-700 dark:text-red-300",         bg: "bg-red-500/10",     border: "border-red-500/40" },
  missing:     { label: "Sem registo",   color: "text-slate-600 dark:text-slate-300",     bg: "bg-slate-500/10",   border: "border-slate-500/30" },
  pending:     { label: "Pendente",      color: "text-violet-700 dark:text-violet-300",   bg: "bg-violet-500/10",  border: "border-violet-500/30" },
};
