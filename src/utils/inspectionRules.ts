export type InspectionResultValue =
  | "aprovado"
  | "aprovado_clausulas"
  | "pendente_relatorio"
  | "chumbou";

export const isElevatorInspection = (categoryKey?: string | null) =>
  categoryKey?.toLowerCase() === "elevador";

export const isGasInspection = (categoryKey?: string | null) =>
  ["gas", "gás"].includes(categoryKey?.toLowerCase() ?? "");

export const usesOnlyNextInspectionDate = (categoryKey?: string | null) =>
  isElevatorInspection(categoryKey) || isGasInspection(categoryKey);

export const inspectionDateIsRequired = (categoryKey?: string | null) =>
  !usesOnlyNextInspectionDate(categoryKey);

export const nextDueDateIsRequired = (
  categoryKey: string | null | undefined,
  result: InspectionResultValue | "",
) => isGasInspection(categoryKey) || (isElevatorInspection(categoryKey) && result !== "pendente_relatorio");

export const inspectionDatesForSave = ({
  categoryKey,
  result,
  inspectionDate,
  nextDueDate,
}: {
  categoryKey?: string | null;
  result: InspectionResultValue;
  inspectionDate: string;
  nextDueDate: string;
}) => ({
  inspection_date: usesOnlyNextInspectionDate(categoryKey) ? null : inspectionDate || null,
  next_due_date: usesOnlyNextInspectionDate(categoryKey) ? nextDueDate || null : undefined,
  result,
});
