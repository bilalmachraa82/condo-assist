import {
  Droplets,
  ArrowUpDown,
  Building2,
  Shield,
  Phone,
  Wrench,
  Flame,
  DoorOpen,
  Fuel,
  HardHat,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface AssemblyCategory {
  value: string;
  label: string;
  icon: LucideIcon;
  bgClass: string;
  textClass: string;
  bgCircleClass: string;
}

export const ASSEMBLY_CATEGORIES: AssemblyCategory[] = [
  { value: "limpeza_caleiras", label: "Limpeza Caleiras", icon: Droplets, bgClass: "bg-teal-100 dark:bg-teal-900/30", textClass: "text-teal-700 dark:text-teal-300", bgCircleClass: "bg-teal-500/10" },
  { value: "elevadores", label: "Elevadores", icon: ArrowUpDown, bgClass: "bg-purple-100 dark:bg-purple-900/30", textClass: "text-purple-700 dark:text-purple-300", bgCircleClass: "bg-purple-500/10" },
  { value: "fachada", label: "Fachada", icon: Building2, bgClass: "bg-slate-100 dark:bg-slate-800/30", textClass: "text-slate-700 dark:text-slate-300", bgCircleClass: "bg-slate-500/10" },
  { value: "seguros", label: "Seguros", icon: Shield, bgClass: "bg-indigo-100 dark:bg-indigo-900/30", textClass: "text-indigo-700 dark:text-indigo-300", bgCircleClass: "bg-indigo-500/10" },
  { value: "intercomunicadores", label: "Intercomunicadores", icon: Phone, bgClass: "bg-cyan-100 dark:bg-cyan-900/30", textClass: "text-cyan-700 dark:text-cyan-300", bgCircleClass: "bg-cyan-500/10" },
  { value: "limpeza", label: "Limpeza", icon: Droplets, bgClass: "bg-blue-100 dark:bg-blue-900/30", textClass: "text-blue-700 dark:text-blue-300", bgCircleClass: "bg-blue-500/10" },
  { value: "colunas_eletricas", label: "Colunas Elétricas", icon: Flame, bgClass: "bg-yellow-100 dark:bg-yellow-900/30", textClass: "text-yellow-700 dark:text-yellow-300", bgCircleClass: "bg-yellow-500/10" },
  { value: "cobertura", label: "Cobertura", icon: HardHat, bgClass: "bg-amber-100 dark:bg-amber-900/30", textClass: "text-amber-700 dark:text-amber-300", bgCircleClass: "bg-amber-500/10" },
  { value: "portoes", label: "Portões", icon: DoorOpen, bgClass: "bg-orange-100 dark:bg-orange-900/30", textClass: "text-orange-700 dark:text-orange-300", bgCircleClass: "bg-orange-500/10" },
  { value: "gas", label: "Gás", icon: Fuel, bgClass: "bg-red-100 dark:bg-red-900/30", textClass: "text-red-700 dark:text-red-300", bgCircleClass: "bg-red-500/10" },
  { value: "obras", label: "Obras", icon: Wrench, bgClass: "bg-emerald-100 dark:bg-emerald-900/30", textClass: "text-emerald-700 dark:text-emerald-300", bgCircleClass: "bg-emerald-500/10" },
  { value: "geral", label: "Geral", icon: BookOpen, bgClass: "bg-gray-100 dark:bg-gray-800/30", textClass: "text-gray-700 dark:text-gray-300", bgCircleClass: "bg-gray-500/10" },
];

export function getAssemblyCategoryConfig(value: string): AssemblyCategory {
  return ASSEMBLY_CATEGORIES.find(c => c.value === value) || ASSEMBLY_CATEGORIES[ASSEMBLY_CATEGORIES.length - 1];
}
