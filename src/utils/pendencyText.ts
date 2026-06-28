import {
  type BuildingDisplaySource,
  normalizeBuildingCode,
  stripLeadingBuildingCode,
} from "./buildingDisplay";

type BuildingLike = BuildingDisplaySource | string | number | null | undefined;

const genericCodePattern = "[A-Z0-9]{2,4}";
const separatorPattern = "[-–—:=]+";
const leadingCondWrappedCode = new RegExp(
  `^\\s*cond\\.\\s*'?=${genericCodePattern}=\\s*(?:${separatorPattern}\\s*)?`,
  "i",
);
const leadingCondBareCode = new RegExp(
  `^\\s*cond\\.\\s*'?${genericCodePattern}\\s*${separatorPattern}\\s*`,
  "i",
);
const leadingWrappedCode = new RegExp(
  `^\\s*'?=${genericCodePattern}=\\s*(?:${separatorPattern}\\s*)?`,
  "i",
);
const leadingBareCode = new RegExp(
  `^\\s*'?${genericCodePattern}\\s*${separatorPattern}\\s*`,
  "i",
);

const getBuildingCode = (building: BuildingLike) =>
  typeof building === "object" ? building?.code : building;

const trimLeadingSeparators = (value: string) =>
  value.replace(/^\s*[-–—:=]+\s*/, "").trim();

const stripGenericLeadingCode = (value: string) => {
  let current = value;
  for (let i = 0; i < 4; i++) {
      const next = trimLeadingSeparators(
        current
          .replace(leadingCondWrappedCode, "")
          .replace(leadingCondBareCode, "")
          .replace(leadingWrappedCode, "")
          .replace(leadingBareCode, ""),
      );
    if (next === current) return next;
    current = next;
  }
  return current;
};

const normalizeForCompare = (value?: string | number | null) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bcondominio\b/g, "cond")
    .replace(/\bcond\.?/g, "cond")
    .replace(/\br\./g, "rua")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const isPendencyBuildingDescriptor = (
  value: string,
  building?: BuildingDisplaySource | null,
) => {
  const cleaned = stripLeadingPendencyCode(value, building?.code);
  if (!cleaned || !building) return false;

  const normalized = normalizeForCompare(cleaned);
  const candidates = [building.name, building.address]
    .flatMap((candidate) => [
      candidate,
      stripLeadingBuildingCode(candidate, building.code),
    ])
    .map(normalizeForCompare)
    .filter(Boolean);

  return candidates.some((candidate) => normalized === candidate);
};

export const stripLeadingPendencyCode = (value: string | null | undefined, buildingCode?: string | number | null) => {
  const text = (value ?? "").trim();
  if (!text) return "";

  if (buildingCode) {
    return stripGenericLeadingCode(
      stripLeadingBuildingCode(text.replace(/^\s*(?:cond\.\s*)'?/i, ""), buildingCode),
    );
  }

  return stripGenericLeadingCode(text);
};

export const cleanPendencyTitle = (
  value: string | null | undefined,
  building?: BuildingDisplaySource | null,
  fallbackValue: string | null | undefined = "",
) => {
  const cleaned = stripLeadingPendencyCode(value, building?.code);
  if (cleaned && !isPendencyBuildingDescriptor(cleaned, building)) return cleaned;

  const fallback = stripLeadingPendencyCode(fallbackValue, building?.code);
  if (fallback && !isPendencyBuildingDescriptor(fallback, building)) return fallback;

  return "";
};

export const ensureBuildingCodeInSubject = (
  subject: string | null | undefined,
  fallbackTitle: string | null | undefined,
  building?: BuildingLike,
) => {
  const source = (subject || fallbackTitle || "").trim();
  const normalizedCode = normalizeBuildingCode(getBuildingCode(building));
  if (!source || !normalizedCode) return stripLeadingPendencyCode(source);

  const buildingSource = typeof building === "object" ? building : null;
  const withoutOtherCode = cleanPendencyTitle(source, buildingSource, fallbackTitle);
  return withoutOtherCode ? `${normalizedCode} - ${withoutOtherCode}` : "";
};
