import {
  ClipboardList,
  Building2,
  ArrowUpDown,
  Flame,
  Zap,
  Shield,
  AlertTriangle,
  Bug,
  Bolt,
  Droplets,
  Wind,
  Truck,
  Scale,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface KnowledgeCategory {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  textClass: string;
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  { value: "procedimentos", label: "Procedimentos", icon: ClipboardList, color: "blue", bgClass: "bg-blue-100 dark:bg-blue-900/30", textClass: "text-blue-700 dark:text-blue-300" },
  { value: "edificios", label: "Edifícios", icon: Building2, color: "slate", bgClass: "bg-slate-100 dark:bg-slate-800/30", textClass: "text-slate-700 dark:text-slate-300" },
  { value: "elevadores", label: "Elevadores", icon: ArrowUpDown, color: "purple", bgClass: "bg-purple-100 dark:bg-purple-900/30", textClass: "text-purple-700 dark:text-purple-300" },
  { value: "extintores", label: "Extintores", icon: Flame, color: "red", bgClass: "bg-red-100 dark:bg-red-900/30", textClass: "text-red-700 dark:text-red-300" },
  { value: "gas", label: "Inspeção de Gás", icon: Zap, color: "yellow", bgClass: "bg-yellow-100 dark:bg-yellow-900/30", textClass: "text-yellow-700 dark:text-yellow-300" },
  { value: "seguros", label: "Seguros", icon: Shield, color: "indigo", bgClass: "bg-indigo-100 dark:bg-indigo-900/30", textClass: "text-indigo-700 dark:text-indigo-300" },
  { value: "acidentes_trabalho", label: "Seg. Acidentes Trabalho", icon: AlertTriangle, color: "orange", bgClass: "bg-orange-100 dark:bg-orange-900/30", textClass: "text-orange-700 dark:text-orange-300" },
  { value: "desbaratizacao", label: "Desbaratização", icon: Bug, color: "amber", bgClass: "bg-amber-100 dark:bg-amber-900/30", textClass: "text-amber-700 dark:text-amber-300" },
  { value: "colunas_eletricas", label: "Colunas Elétricas", icon: Bolt, color: "cyan", bgClass: "bg-cyan-100 dark:bg-cyan-900/30", textClass: "text-cyan-700 dark:text-cyan-300" },
  { value: "caleiras", label: "Limpeza Caleiras", icon: Droplets, color: "teal", bgClass: "bg-teal-100 dark:bg-teal-900/30", textClass: "text-teal-700 dark:text-teal-300" },
  { value: "chamines", label: "Chaminés", icon: Wind, color: "gray", bgClass: "bg-gray-100 dark:bg-gray-800/30", textClass: "text-gray-700 dark:text-gray-300" },
  { value: "fornecedores", label: "Fornecedores", icon: Truck, color: "emerald", bgClass: "bg-emerald-100 dark:bg-emerald-900/30", textClass: "text-emerald-700 dark:text-emerald-300" },
  { value: "legal", label: "Legal", icon: Scale, color: "violet", bgClass: "bg-violet-100 dark:bg-violet-900/30", textClass: "text-violet-700 dark:text-violet-300" },
  { value: "geral", label: "Geral", icon: BookOpen, color: "slate", bgClass: "bg-slate-100 dark:bg-slate-800/30", textClass: "text-slate-700 dark:text-slate-300" },
];

export function getCategoryConfig(value: string): KnowledgeCategory {
  return KNOWLEDGE_CATEGORIES.find(c => c.value === value) || KNOWLEDGE_CATEGORIES[KNOWLEDGE_CATEGORIES.length - 1];
}
