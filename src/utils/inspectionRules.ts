export type InspectionResultValue =
  | "aprovado"
  | "aprovado_clausulas"
  | "pendente_relatorio"
  | "chumbou";

export const isElevatorInspection = (categoryKey?: string | null) =>
  categoryKey?.toLowerCase() === "elevador";

export const inspectionDateIsRequired = (categoryKey?: string | null) =>
  !isElevatorInspection(categoryKey);

export const nextDueDateIsRequired = (
  categoryKey: string | null | undefined,
  result: InspectionResultValue | "",
) => isElevatorInspection(categoryKey) && result !== "pendente_relatorio";

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
  inspection_date: isElevatorInspection(categoryKey) ? null : inspectionDate || null,
  next_due_date: isElevatorInspection(categoryKey) ? nextDueDate || null : undefined,
  result,
});
