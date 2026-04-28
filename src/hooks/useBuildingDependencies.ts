import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CLOSED_ASSISTANCE_STATUSES } from "@/utils/constants";

export interface BuildingDependencies {
  assistancesTotal: number;
  assistancesOpen: number;
  assistancesClosed: number;
  assemblyItems: number;
  contacts: number;
  knowledgeArticles: number;
  /** Always true now — permanent delete is allowed but cascades to history. */
  canDeletePermanently: boolean;
  /** True when there is history that will be cascade-deleted. */
  hasHistory: boolean;
}

/**
 * Counts all records that reference a given building, used to inform the user
 * about the impact of a permanent delete (which now cascades).
 *
 * Cascade behavior on building delete:
 *   - assistances        → CASCADE (deleted with the building)
 *   - assembly_items     → CASCADE (deleted with the building)
 *   - condominium_contacts → CASCADE (deleted with the building)
 *   - knowledge_articles → SET NULL (kept, reference cleared)
 */
export const useBuildingDependencies = (buildingId: string | undefined) => {
  return useQuery({
    queryKey: ["building-dependencies", buildingId],
    enabled: !!buildingId,
    queryFn: async (): Promise<BuildingDependencies> => {
      if (!buildingId) {
        return {
          assistancesTotal: 0,
          assistancesOpen: 0,
          assistancesClosed: 0,
          assemblyItems: 0,
          contacts: 0,
          knowledgeArticles: 0,
          canDeletePermanently: true,
        };
      }

      const [assistancesRes, assemblyRes, contactsRes, articlesRes] = await Promise.all([
        supabase
          .from("assistances")
          .select("status", { count: "exact" })
          .eq("building_id", buildingId),
        supabase
          .from("assembly_items")
          .select("id", { count: "exact", head: true })
          .eq("building_id", buildingId),
        supabase
          .from("condominium_contacts")
          .select("id", { count: "exact", head: true })
          .eq("building_id", buildingId),
        supabase
          .from("knowledge_articles")
          .select("id", { count: "exact", head: true })
          .eq("building_id", buildingId),
      ]);

      if (assistancesRes.error) throw assistancesRes.error;
      if (assemblyRes.error) throw assemblyRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (articlesRes.error) throw articlesRes.error;

      const assistances = assistancesRes.data ?? [];
      const assistancesTotal = assistancesRes.count ?? assistances.length;
      const assistancesClosed = assistances.filter(a =>
        CLOSED_ASSISTANCE_STATUSES.includes(a.status as any)
      ).length;
      const assistancesOpen = assistancesTotal - assistancesClosed;

      const assemblyItems = assemblyRes.count ?? 0;

      return {
        assistancesTotal,
        assistancesOpen,
        assistancesClosed,
        assemblyItems,
        contacts: contactsRes.count ?? 0,
        knowledgeArticles: articlesRes.count ?? 0,
        canDeletePermanently: assistancesTotal === 0 && assemblyItems === 0,
      };
    },
  });
};
