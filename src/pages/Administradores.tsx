import { useMemo, useState } from "react";
import { UserCog, Search, Building2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBuildings } from "@/hooks/useBuildings";
import {
  BuildingServicePlan,
  getBuildingServicePlan,
  MAX_ADMINS_PER_BUILDING,
  SERVICE_PLAN_LABELS,
  useBuildingAdministrators,
  useUpdateBuildingServicePlan,
} from "@/hooks/useBuildingAdministrators";
import BuildingAdministratorsManager from "@/components/buildings/BuildingAdministratorsManager";
import AdministratorsImportDialog from "@/components/buildings/AdministratorsImportDialog";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBuildingAddress, formatBuildingLabel } from "@/utils/buildingDisplay";
import type { Tables } from "@/integrations/supabase/types";

type BuildingRow = Tables<"buildings">;

function BuildingAdminCount({ buildingId }: { buildingId: string }) {
  const { data = [] } = useBuildingAdministrators(buildingId);
  const full = data.length >= MAX_ADMINS_PER_BUILDING;
  return (
    <Badge variant={full ? "secondary" : "outline"} className="ml-2">
      {data.length}/{MAX_ADMINS_PER_BUILDING}
    </Badge>
  );
}

function BuildingServicePlanSelect({ building }: { building: BuildingRow }) {
  const updatePlan = useUpdateBuildingServicePlan();
  const plan = getBuildingServicePlan(building.admin_notes);

  return (
    <Select
      value={plan}
      onValueChange={(value) =>
        updatePlan.mutate({
          id: building.id,
          adminNotes: building.admin_notes,
          servicePlan: value as BuildingServicePlan,
        })
      }
      disabled={updatePlan.isPending}
    >
      <SelectTrigger className="h-9 min-h-9 w-full sm:w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="basico">{SERVICE_PLAN_LABELS.basico}</SelectItem>
        <SelectItem value="premium">{SERVICE_PLAN_LABELS.premium}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function Administradores() {
  const { data: buildings = [], isLoading } = useBuildings();
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return buildings;
    return buildings.filter((b) =>
      `${b.code} ${b.name} ${b.address ?? ""}`.toLowerCase().includes(t)
    );
  }, [buildings, q]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            Administradores de Edifícios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de até {MAX_ADMINS_PER_BUILDING} administradores por edifício.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Procurar edifício…"
              className="pl-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Importar
          </Button>
        </div>
      </div>

      <AdministratorsImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtered.length} {filtered.length === 1 ? "edifício" : "edifícios"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem edifícios.
            </p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {filtered.map((b) => (
                <AccordionItem key={b.id} value={b.id}>
                  <div className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center">
                    <AccordionTrigger className="min-w-0 flex-1 py-2 hover:no-underline">
                      <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {formatBuildingLabel(b)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {formatBuildingAddress(b)}
                          </span>
                        </div>
                        <BuildingAdminCount buildingId={b.id} />
                      </div>
                    </AccordionTrigger>
                    <div className="pl-6 sm:pl-0">
                      <BuildingServicePlanSelect building={b} />
                    </div>
                  </div>
                  <AccordionContent>
                    <div className="pt-2">
                      <BuildingAdministratorsManager buildingId={b.id} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
