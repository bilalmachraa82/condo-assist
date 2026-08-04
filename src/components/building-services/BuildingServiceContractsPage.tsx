import { useEffect, useMemo, useState } from "react";
import { Bug, Building2, Save, Search, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useBuildings } from "@/hooks/useBuildings";
import {
  getContractForBuilding,
  getEmptyServiceFields,
  serviceContractHasData,
  useBuildingServiceContracts,
  useUpsertBuildingServiceContract,
  type BuildingServiceContract,
  type BuildingServiceFields,
  type BuildingServiceType,
  type CleaningServiceFields,
  type PestControlServiceFields,
} from "@/hooks/useBuildingServiceContracts";
import { formatBuildingLabel } from "@/utils/buildingDisplay";

interface Props {
  serviceType: BuildingServiceType;
}

const copy = {
  cleaning: {
    title: "Empresa de Limpeza",
    description: "Contratos e contactos de limpeza por edifício.",
    empty: "Sem dados de limpeza registados.",
    icon: Sparkles,
  },
  pest_control: {
    title: "Desbaratização",
    description: "Contratos de desbaratização por edifício.",
    empty: "Sem dados de desbaratização registados.",
    icon: Bug,
  },
};

function cloneFields<T extends BuildingServiceFields>(fields: T): T {
  return { ...fields };
}

function CleaningFieldsForm({
  value,
  onChange,
}: {
  value: CleaningServiceFields;
  onChange: (value: CleaningServiceFields) => void;
}) {
  const set = <K extends keyof CleaningServiceFields>(key: K, next: CleaningServiceFields[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label className="text-xs">Empresa</Label>
        <Input value={value.company} onChange={(e) => set("company", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Contactos</Label>
        <Input value={value.contacts} onChange={(e) => set("contacts", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Email</Label>
        <Input type="email" value={value.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Data de Contrato</Label>
        <Input
          type="date"
          value={value.contractDate}
          disabled={value.noContract}
          onChange={(e) => set("contractDate", e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <Checkbox
          checked={value.noContract}
          onCheckedChange={(checked) => onChange({ ...value, noContract: checked === true, contractDate: checked ? "" : value.contractDate })}
        />
        Não tem contrato
      </label>
      <div>
        <Label className="text-xs">Periodicidade</Label>
        <Input value={value.periodicity} onChange={(e) => set("periodicity", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Quantas Lavagens por Ano</Label>
        <Input inputMode="numeric" value={value.washesPerYear} onChange={(e) => set("washesPerYear", e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <Checkbox
          checked={value.garageCleaningKnown}
          onCheckedChange={(checked) => onChange({ ...value, garageCleaningKnown: checked === true })}
        />
        Limpeza de Garagens registada
      </label>
      {value.garageCleaningKnown && (
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <Checkbox
            checked={value.garageCleaning}
            onCheckedChange={(checked) => set("garageCleaning", checked === true)}
          />
          Inclui limpeza de garagens
        </label>
      )}
    </div>
  );
}

function PestControlFieldsForm({
  value,
  onChange,
}: {
  value: PestControlServiceFields;
  onChange: (value: PestControlServiceFields) => void;
}) {
  const set = <K extends keyof PestControlServiceFields>(key: K, next: PestControlServiceFields[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label className="text-xs">Empresa</Label>
        <Input value={value.company} onChange={(e) => set("company", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Tipo de Contrato</Label>
        <Input value={value.contractType} onChange={(e) => set("contractType", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Data do Contrato</Label>
        <Input type="date" value={value.contractDate} onChange={(e) => set("contractDate", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Duração do Contrato</Label>
        <Input value={value.contractDuration} onChange={(e) => set("contractDuration", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Nº Visitas Anuais</Label>
        <Input inputMode="numeric" value={value.annualVisits} onChange={(e) => set("annualVisits", e.target.value)} />
      </div>
    </div>
  );
}

function BuildingServiceEditor({
  building,
  contract,
  serviceType,
}: {
  building: { id: string; code?: string | number | null; name?: string | null; address?: string | null };
  contract: BuildingServiceContract | null;
  serviceType: BuildingServiceType;
}) {
  const upsert = useUpsertBuildingServiceContract(serviceType);
  const [draft, setDraft] = useState<BuildingServiceFields>(() =>
    cloneFields(contract?.fields ?? getEmptyServiceFields(serviceType)),
  );

  useEffect(() => {
    setDraft(cloneFields(contract?.fields ?? getEmptyServiceFields(serviceType)));
  }, [contract, serviceType]);

  const save = async () => {
    await upsert.mutateAsync({
      buildingId: building.id,
      buildingCode: building.code ?? "",
      fields: draft,
      existingArticleId: contract?.article_id,
      existingMetadata: contract?.metadata,
    });
  };

  return (
    <div className="space-y-4 pt-2">
      {serviceType === "cleaning" ? (
        <CleaningFieldsForm value={draft as CleaningServiceFields} onChange={setDraft as (value: CleaningServiceFields) => void} />
      ) : (
        <PestControlFieldsForm value={draft as PestControlServiceFields} onChange={setDraft as (value: PestControlServiceFields) => void} />
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {contract?.updated_at ? `Última atualização: ${new Date(contract.updated_at).toLocaleDateString("pt-PT")}` : copy[serviceType].empty}
        </p>
        <Button type="button" size="sm" onClick={save} disabled={upsert.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {upsert.isPending ? "A guardar..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export default function BuildingServiceContractsPage({ serviceType }: Props) {
  const pageCopy = copy[serviceType];
  const Icon = pageCopy.icon;
  const { data: buildings = [], isLoading: buildingsLoading } = useBuildings();
  const { data: contracts = [], isLoading: contractsLoading } = useBuildingServiceContracts(serviceType);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return buildings
      .map((building) => ({
        building,
        contract: getContractForBuilding(contracts, building),
      }))
      .filter(({ building }) => {
        if (!query) return true;
        return `${building.code} ${building.name} ${building.address ?? ""}`.toLowerCase().includes(query);
      });
  }, [buildings, contracts, q]);

  const filledCount = rows.filter(({ contract }) => serviceContractHasData(contract)).length;
  const isLoading = buildingsLoading || contractsLoading;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" />
            {pageCopy.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{pageCopy.description}</p>
        </div>
        <div className="relative flex-1 sm:flex-none sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Procurar edifício..."
            className="pl-8"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {rows.length} {rows.length === 1 ? "edifício" : "edifícios"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {filledCount} com registo
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem edifícios.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {rows.map(({ building, contract }) => {
                const hasData = serviceContractHasData(contract);
                return (
                  <AccordionItem key={building.id} value={building.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2 flex-1 text-left min-w-0">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{formatBuildingLabel(building)}</span>
                        <Badge variant={hasData ? "secondary" : "outline"} className="ml-auto shrink-0">
                          {hasData ? "preenchido" : "sem registo"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <BuildingServiceEditor building={building} contract={contract} serviceType={serviceType} />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

