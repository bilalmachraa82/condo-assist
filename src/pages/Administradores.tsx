import { useMemo, useState } from "react";
import { UserCog, Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBuildings } from "@/hooks/useBuildings";
import { useBuildingAdministrators, MAX_ADMINS_PER_BUILDING } from "@/hooks/useBuildingAdministrators";
import BuildingAdministratorsManager from "@/components/buildings/BuildingAdministratorsManager";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

function BuildingAdminCount({ buildingId }: { buildingId: string }) {
  const { data = [] } = useBuildingAdministrators(buildingId);
  const full = data.length >= MAX_ADMINS_PER_BUILDING;
  return (
    <Badge variant={full ? "secondary" : "outline"} className="ml-2">
      {data.length}/{MAX_ADMINS_PER_BUILDING}
    </Badge>
  );
}

export default function Administradores() {
  const { data: buildings = [], isLoading } = useBuildings();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return buildings;
    return buildings.filter((b: any) =>
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
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Procurar edifício…"
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

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
              {filtered.map((b: any) => (
                <AccordionItem key={b.id} value={b.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2 flex-1 text-left">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {b.code} - {b.name}
                      </span>
                      <BuildingAdminCount buildingId={b.id} />
                    </div>
                  </AccordionTrigger>
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
