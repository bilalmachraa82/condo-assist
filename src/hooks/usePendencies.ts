import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PendencyStatus =
  | "aberto"
  | "aguarda_resposta"
  | "resposta_recebida"
  | "precisa_decisao"
  | "escalado"
  | "resolvido"
  | "cancelado";

export const PENDENCY_STATUS_LABELS: Record<PendencyStatus, string> = {
  aberto: "Aberto",
  aguarda_resposta: "Aguarda resposta",
  resposta_recebida: "Resposta recebida",
  precisa_decisao: "Precisa decisão",
  escalado: "Escalado",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
};

export const PENDENCY_STATUS_ORDER: PendencyStatus[] = [
  "aberto",
  "aguarda_resposta",
  "resposta_recebida",
  "precisa_decisao",
  "escalado",
  "resolvido",
  "cancelado",
];

export interface Pendency {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  email_sent_at: string | null;
  building_id: string;
  assistance_id: string | null;
  supplier_id: string | null;
  status: PendencyStatus;
  priority: "low" | "normal" | "urgent" | "critical";
  assigned_to: string | null;
  due_date: string | null;
  last_activity_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  buildings?: { id: string; code: string; name: string } | null;
  assistances?: { id: string; assistance_number: number; title: string } | null;
  suppliers?: { id: string; name: string; email: string | null } | null;
  attachments_count?: number;
  notes_count?: number;
}

export function usePendencies() {
  return useQuery({
    queryKey: ["email-pendencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_pendencies")
        .select(`
          *,
          buildings:building_id (id, code, name),
          assistances:assistance_id (id, assistance_number, title),
          suppliers:supplier_id (id, name, email)
        `)
        .order("last_activity_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Pendency[];
    },
  });
}

export function usePendency(id: string | null) {
  return useQuery({
    queryKey: ["email-pendency", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_pendencies")
        .select(`
          *,
          buildings:building_id (id, code, name),
          assistances:assistance_id (id, assistance_number, title),
          suppliers:supplier_id (id, name, email)
        `)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Pendency | null;
    },
  });
}

export function usePendencyNotes(pendencyId: string | null) {
  return useQuery({
    queryKey: ["pendency-notes", pendencyId],
    enabled: !!pendencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_pendency_notes")
        .select("*")
        .eq("pendency_id", pendencyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePendencyAttachments(pendencyId: string | null) {
  return useQuery({
    queryKey: ["pendency-attachments", pendencyId],
    enabled: !!pendencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_pendency_attachments")
        .select("*")
        .eq("pendency_id", pendencyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePendency() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string | null;
      subject?: string | null;
      email_sent_at?: string | null;
      building_id: string;
      assistance_id?: string | null;
      supplier_id?: string | null;
      priority?: "low" | "normal" | "urgent" | "critical";
      status?: PendencyStatus;
      assigned_to?: string | null;
      due_date?: string | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("email_pendencies")
        .insert({ ...input, created_by: u.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-pendencies"] });
      toast({ title: "Pendência criada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdatePendency() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Pendency> & { id: string }) => {
      const { data, error } = await supabase
        .from("email_pendencies")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["email-pendencies"] });
      qc.invalidateQueries({ queryKey: ["email-pendency", vars.id] });
      qc.invalidateQueries({ queryKey: ["pendency-notes", vars.id] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeletePendency() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_pendencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-pendencies"] });
      toast({ title: "Pendência removida" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useAddPendencyNote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ pendencyId, body }: { pendencyId: string; body: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("email_pendency_notes").insert({
        pendency_id: pendencyId,
        author_id: u.user?.id ?? null,
        body,
        note_type: "manual",
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pendency-notes", vars.pendencyId] });
      qc.invalidateQueries({ queryKey: ["email-pendencies"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUploadPendencyFile() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      pendencyId,
      file,
      kind = "email_pdf",
      description,
    }: {
      pendencyId: string;
      file: File;
      kind?: "email_pdf" | "reply_pdf" | "attachment" | "other";
      description?: string;
    }) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("upload-pendency-file", {
        body: {
          pendencyId,
          fileName: file.name,
          fileType: file.type || "application/pdf",
          fileData: dataUrl,
          kind,
          description,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pendency-attachments", vars.pendencyId] });
      qc.invalidateQueries({ queryKey: ["email-pendencies"] });
      toast({ title: "Ficheiro anexado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeletePendencyAttachment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, pendencyId, filePath }: { id: string; pendencyId: string; filePath: string }) => {
      await supabase.storage.from("email-pendencies").remove([filePath]);
      const { error } = await supabase.from("email_pendency_attachments").delete().eq("id", id);
      if (error) throw error;
      return { pendencyId };
    },
    onSuccess: ({ pendencyId }) => {
      qc.invalidateQueries({ queryKey: ["pendency-attachments", pendencyId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export async function getPendencyFileSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("email-pendencies")
    .createSignedUrl(filePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export function pendencySLA(p: Pick<Pendency, "status" | "last_activity_at">): "ok" | "warn" | "danger" {
  if (p.status === "resolvido" || p.status === "cancelado") return "ok";
  const days = (Date.now() - new Date(p.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
  if (days > 7) return "danger";
  if (days > 3 && (p.status === "aguarda_resposta" || p.status === "escalado")) return "warn";
  return "ok";
}
