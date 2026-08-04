import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BuildingAdministrator {
  id: string;
  building_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  floor: string | null;
  role: string | null;
  notes: string | null;
  is_primary: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const MAX_ADMINS_PER_BUILDING = 5;

export type BuildingServicePlan = "basico" | "premium";

const SERVICE_PLAN_MARKER_RE = /\[PLANO_ASSISTENCIA:(basico|premium)\]/i;
const SERVICE_PLAN_MARKER_GLOBAL_RE = /\n?\[PLANO_ASSISTENCIA:(basico|premium)\]\n?/gi;

export const SERVICE_PLAN_LABELS: Record<BuildingServicePlan, string> = {
  basico: "Plano Básico",
  premium: "Plano Premium",
};

export function getBuildingServicePlan(notes?: string | null): BuildingServicePlan {
  const plan = notes?.match(SERVICE_PLAN_MARKER_RE)?.[1]?.toLowerCase();
  return plan === "premium" ? "premium" : "basico";
}

export function setBuildingServicePlanMarker(
  notes: string | null | undefined,
  plan: BuildingServicePlan,
) {
  const marker = `[PLANO_ASSISTENCIA:${plan}]`;
  const preservedNotes = (notes ?? "")
    .replace(SERVICE_PLAN_MARKER_GLOBAL_RE, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return preservedNotes ? `${preservedNotes}\n${marker}` : marker;
}

export function useBuildingAdministrators(buildingId?: string | null) {
  return useQuery({
    queryKey: ["building-administrators", buildingId],
    enabled: !!buildingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_administrators")
        .select("*")
        .eq("building_id", buildingId!)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BuildingAdministrator[];
    },
  });
}

export function useUpsertBuildingAdministrator() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<BuildingAdministrator> & { building_id: string; name: string }) => {
      const { data, error } = await supabase
        .from("building_administrators")
        .upsert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["building-administrators", vars.building_id] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteBuildingAdministrator() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, buildingId }: { id: string; buildingId: string }) => {
      const { error } = await supabase.from("building_administrators").delete().eq("id", id);
      if (error) throw error;
      return buildingId;
    },
    onSuccess: (buildingId) => {
      qc.invalidateQueries({ queryKey: ["building-administrators", buildingId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateBuildingServicePlan() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      adminNotes,
      servicePlan,
    }: {
      id: string;
      adminNotes?: string | null;
      servicePlan: BuildingServicePlan;
    }) => {
      const { data, error } = await supabase
        .from("buildings")
        .update({
          admin_notes: setBuildingServicePlanMarker(adminNotes, servicePlan),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: "Plano atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
