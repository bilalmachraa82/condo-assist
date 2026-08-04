import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeBuildingCode } from "@/utils/buildingDisplay";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type BuildingServiceType = "cleaning" | "pest_control";

export interface CleaningServiceFields {
  company: string;
  contacts: string;
  email: string;
  contractDate: string;
  noContract: boolean;
  periodicity: string;
  garageCleaning: boolean;
  garageCleaningKnown: boolean;
  washesPerYear: string;
}

export interface PestControlServiceFields {
  company: string;
  contractType: string;
  contractDate: string;
  contractDuration: string;
  annualVisits: string;
}

export type BuildingServiceFields = CleaningServiceFields | PestControlServiceFields;

export interface BuildingServiceContract<TFields extends BuildingServiceFields = BuildingServiceFields> {
  id: string;
  building_id: string | null;
  building_code: string | null;
  service_type: BuildingServiceType;
  article_id: string | null;
  title: string;
  content: string;
  category: string;
  tags: string[];
  metadata: Record<string, unknown>;
  fields: TFields;
  updated_at: string | null;
}

type KnowledgeArticleWithBuilding = Tables<"knowledge_articles"> & {
  buildings: Pick<Tables<"buildings">, "id" | "code" | "name"> | null;
};

export const SERVICE_CATEGORY: Record<BuildingServiceType, string> = {
  cleaning: "empresas_limpeza",
  pest_control: "desbaratizacao",
};

const SERVICE_LABEL: Record<BuildingServiceType, string> = {
  cleaning: "Empresa de Limpeza",
  pest_control: "Desbaratização",
};

const emptyCleaningFields = (): CleaningServiceFields => ({
  company: "",
  contacts: "",
  email: "",
  contractDate: "",
  noContract: false,
  periodicity: "",
  garageCleaning: false,
  garageCleaningKnown: false,
  washesPerYear: "",
});

const emptyPestControlFields = (): PestControlServiceFields => ({
  company: "",
  contractType: "",
  contractDate: "",
  contractDuration: "",
  annualVisits: "",
});

export const getEmptyServiceFields = (serviceType: BuildingServiceType): BuildingServiceFields =>
  serviceType === "cleaning" ? emptyCleaningFields() : emptyPestControlFields();

const cleanValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return text === "-" ? "" : text;
};

const toDateInputValue = (value: unknown): string => {
  const text = cleanValue(value);
  if (!text || /não tem contrato/i.test(text)) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return "";
  const [, d, m, y] = match;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

const formatDatePt = (value: string): string => {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const truthyPortuguese = (value: unknown): boolean => {
  const text = cleanValue(value).toLowerCase();
  return ["sim", "s", "yes", "true", "1"].includes(text);
};

const extractMarkdownField = (content: string, label: string): string => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`\\*\\*${escaped}:\\*\\*\\s*([^\\n]+)`, "i"));
  return cleanValue(match?.[1]);
};

const getStructuredMetadata = (metadata: Record<string, unknown>): Record<string, unknown> => {
  const value = metadata.service_contract;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

const parseCleaningFields = (content: string, metadata: Record<string, unknown>): CleaningServiceFields => {
  const structured = getStructuredMetadata(metadata);
  const contractText = cleanValue(structured.contractDate) || extractMarkdownField(content, "Data Contrato");
  const garageText = cleanValue(structured.garageCleaning) || extractMarkdownField(content, "Garagem");
  const fields: CleaningServiceFields = {
    company: cleanValue(structured.company) || extractMarkdownField(content, "Empresa"),
    contacts: cleanValue(structured.contacts) || extractMarkdownField(content, "Contacto"),
    email: cleanValue(structured.email) || extractMarkdownField(content, "Email"),
    contractDate: toDateInputValue(contractText),
    noContract: Boolean(structured.noContract) || /não tem contrato/i.test(contractText),
    periodicity: cleanValue(structured.periodicity) || extractMarkdownField(content, "Periodicidade"),
    garageCleaning: typeof structured.garageCleaning === "boolean" ? structured.garageCleaning : truthyPortuguese(garageText),
    garageCleaningKnown: typeof structured.garageCleaning === "boolean" || !!garageText,
    washesPerYear: cleanValue(structured.washesPerYear) || extractMarkdownField(content, "Lavagens/Ano"),
  };
  return fields;
};

const parsePestControlFields = (content: string, metadata: Record<string, unknown>): PestControlServiceFields => {
  const structured = getStructuredMetadata(metadata);
  return {
    company: cleanValue(structured.company) || extractMarkdownField(content, "Empresa"),
    contractType: cleanValue(structured.contractType) || extractMarkdownField(content, "Tipo Contrato"),
    contractDate: toDateInputValue(cleanValue(structured.contractDate) || extractMarkdownField(content, "Data Contrato")),
    contractDuration: cleanValue(structured.contractDuration) || extractMarkdownField(content, "Duração"),
    annualVisits: cleanValue(structured.annualVisits) || extractMarkdownField(content, "Visitas/Ano"),
  };
};

const parseBuildingCodeFromTitle = (title: string): string | null => {
  const match = title.match(/^=?(\d{1,4})=?\s*[-–—]/);
  return match ? normalizeBuildingCode(match[1]) : null;
};

const getArticleBuildingKey = (article: KnowledgeArticleWithBuilding): string | null =>
  article.building_id || parseBuildingCodeFromTitle(article.title);

const hasServiceData = (fields: BuildingServiceFields): boolean =>
  Object.values(fields).some((value) => (typeof value === "boolean" ? value : cleanValue(value)));

const buildContent = (serviceType: BuildingServiceType, fields: BuildingServiceFields): string => {
  const lines = [`## ${SERVICE_LABEL[serviceType]}`, ""];
  if (serviceType === "cleaning") {
    const f = fields as CleaningServiceFields;
    if (f.company) lines.push(`- **Empresa:** ${f.company}`);
    if (f.contacts) lines.push(`- **Contacto:** ${f.contacts}`);
    if (f.email) lines.push(`- **Email:** ${f.email}`);
    if (f.noContract) {
      lines.push("- **Data Contrato:** Não tem contrato");
    } else if (f.contractDate) {
      lines.push(`- **Data Contrato:** ${formatDatePt(f.contractDate)}`);
    }
    if (f.periodicity) lines.push(`- **Periodicidade:** ${f.periodicity}`);
    if (f.garageCleaningKnown) lines.push(`- **Garagem:** ${f.garageCleaning ? "Sim" : "Não"}`);
    if (f.washesPerYear) lines.push(`- **Lavagens/Ano:** ${f.washesPerYear}`);
  } else {
    const f = fields as PestControlServiceFields;
    if (f.company) lines.push(`- **Empresa:** ${f.company}`);
    if (f.contractType) lines.push(`- **Tipo Contrato:** ${f.contractType}`);
    if (f.contractDate) lines.push(`- **Data Contrato:** ${formatDatePt(f.contractDate)}`);
    if (f.contractDuration) lines.push(`- **Duração:** ${f.contractDuration}`);
    if (f.annualVisits) lines.push(`- **Visitas/Ano:** ${f.annualVisits}`);
  }
  return lines.join("\n").trim();
};

const buildTitle = (buildingCode: string | number | null | undefined, serviceType: BuildingServiceType): string =>
  `${normalizeBuildingCode(buildingCode)} - ${SERVICE_LABEL[serviceType]}`;

const buildTags = (serviceType: BuildingServiceType): string[] =>
  serviceType === "cleaning" ? ["limpeza", "fornecedor"] : ["desbaratização", "fornecedor"];

const toContract = (article: KnowledgeArticleWithBuilding, serviceType: BuildingServiceType): BuildingServiceContract => {
  const metadata = (article.metadata ?? {}) as Record<string, unknown>;
  const fields = serviceType === "cleaning"
    ? parseCleaningFields(article.content ?? "", metadata)
    : parsePestControlFields(article.content ?? "", metadata);

  return {
    id: article.id,
    building_id: article.building_id,
    building_code: article.buildings?.code ?? parseBuildingCodeFromTitle(article.title),
    service_type: serviceType,
    article_id: article.id,
    title: article.title,
    content: article.content,
    category: article.category,
    tags: article.tags ?? [],
    metadata,
    fields,
    updated_at: article.updated_at ?? null,
  };
};

export function useBuildingServiceContracts(serviceType: BuildingServiceType) {
  const categories = useMemo(
    () => serviceType === "cleaning" ? [SERVICE_CATEGORY.cleaning, "geral"] : [SERVICE_CATEGORY.pest_control],
    [serviceType],
  );

  return useQuery({
    queryKey: ["building-service-contracts", serviceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select("*, buildings(id, code, name)")
        .in("category", categories)
        .eq("is_published", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as KnowledgeArticleWithBuilding[])
        .filter((article) => {
          if (serviceType === "pest_control") return article.category === SERVICE_CATEGORY.pest_control;
          return article.category === SERVICE_CATEGORY.cleaning || /empresa de limpeza/i.test(article.title);
        })
        .map((article) => toContract(article, serviceType));
    },
  });
}

export function useUpsertBuildingServiceContract(serviceType: BuildingServiceType) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      buildingId,
      buildingCode,
      fields,
      existingArticleId,
      existingMetadata = {},
    }: {
      buildingId: string;
      buildingCode: string | number;
      fields: BuildingServiceFields;
      existingArticleId?: string | null;
      existingMetadata?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const category = SERVICE_CATEGORY[serviceType];
      const payload = {
        title: buildTitle(buildingCode, serviceType),
        content: buildContent(serviceType, fields),
        category,
        subcategory: SERVICE_LABEL[serviceType],
        tags: buildTags(serviceType),
        building_id: buildingId,
        is_global: false,
        is_published: true,
        metadata: {
          ...existingMetadata,
          service_contract: {
            serviceType,
            ...fields,
          },
        },
      };

      if (existingArticleId) {
        const { data, error } = await supabase
          .from("knowledge_articles")
          .update(payload as TablesUpdate<"knowledge_articles">)
          .eq("id", existingArticleId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("knowledge_articles")
        .insert({ ...payload, created_by: user?.id } as TablesInsert<"knowledge_articles">)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-service-contracts", serviceType] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-category-counts"] });
      toast({ title: "Dados guardados", description: "A informação do edifício foi atualizada." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function getContractForBuilding(
  contracts: BuildingServiceContract[],
  building: { id: string; code?: string | number | null },
): BuildingServiceContract | null {
  const code = normalizeBuildingCode(building.code);
  return contracts.find((contract) => contract.building_id === building.id)
    ?? contracts.find((contract) => contract.building_code === code)
    ?? null;
}

export function serviceContractHasData(contract: BuildingServiceContract | null): boolean {
  return !!contract && hasServiceData(contract.fields);
}
