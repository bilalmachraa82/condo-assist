export type BuildingDisplaySource = {
  code?: string | number | null;
  name?: string | null;
  address?: string | null;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeRawBuildingCode = (code?: string | number | null): string => {
  if (code === null || code === undefined) return "";

  return String(code)
    .trim()
    .replace(/^=+|=+$/g, "")
    .trim();
};

export const normalizeBuildingCode = (code?: string | number | null): string => {
  const normalized = normalizeRawBuildingCode(code);

  return /^\d+$/.test(normalized) ? normalized.padStart(3, "0") : normalized;
};

const getBuildingCodeVariants = (code?: string | number | null): string[] => {
  const normalized = normalizeBuildingCode(code);
  const raw = normalizeRawBuildingCode(code);

  return Array.from(new Set([normalized, raw].filter(Boolean))).sort(
    (a, b) => b.length - a.length,
  );
};

export const stripLeadingBuildingCode = (
  value?: string | null,
  code?: string | number | null,
): string => {
  const text = (value ?? "").trim();
  const codeVariants = getBuildingCodeVariants(code);

  if (!text || codeVariants.length === 0) return text;

  const codePattern = codeVariants.map(escapeRegExp).join("|");
  const bareCode = `(?:${codePattern})(?=\\s|[-–—:]|$)`;
  const wrappedCode = `=(?:${codePattern})=`;
  const leadingCode = new RegExp(
    `^(?:${bareCode}\\s*[-–—:]\\s*)?(?:${wrappedCode}|${bareCode})(?:\\s*[-–—:]\\s*)?`,
    "i",
  );

  return text.replace(leadingCode, "").trim();
};

export const formatBuildingLabel = (
  building?: BuildingDisplaySource | null,
  fallback = "Sem edifício",
): string => {
  if (!building) return fallback;

  const code = normalizeBuildingCode(building.code);
  const source = building.name || building.address || "";
  const label = stripLeadingBuildingCode(source, building.code);

  if (code && label) return `=${code}= ${label}`;
  if (code) return `=${code}=`;
  return label || fallback;
};

export const formatPlainBuildingLabel = (
  building?: BuildingDisplaySource | null,
  fallback = "Sem edifício",
): string => {
  if (!building) return fallback;

  const code = normalizeBuildingCode(building.code);
  const source = building.name || building.address || "";
  const label = stripLeadingBuildingCode(source, building.code);

  if (code && label) return `${code} - ${label}`;
  if (code) return code;
  return label || fallback;
};

export const formatBuildingAddress = (
  building?: BuildingDisplaySource | null,
  fallback = "Sem morada",
): string => {
  if (!building) return fallback;

  return building.address?.trim() || formatBuildingLabel(building, fallback);
};
