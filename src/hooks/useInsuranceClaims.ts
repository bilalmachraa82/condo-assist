import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ClaimStatus =
  | "aberto" | "em_analise" | "aguarda_peritagem" | "peritagem_realizada"
  | "aguarda_pagamento" | "pago" | "recusado" | "arquivado";

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  aguarda_peritagem: "Aguarda peritagem",
  peritagem_realizada: "Peritagem realizada",
  aguarda_pagamento: "Aguarda pagamento",
  pago: "Pago",
  recusado: "Recusado",
  arquivado: "Arquivado",
};

export const CLAIM_OPEN_STATUSES: ClaimStatus[] = [
  "aberto", "em_analise", "aguarda_peritagem", "peritagem_realizada", "aguarda_pagamento",
];

export interface InsuranceClaim {
  id: string;
  claim_number: string;
  building_id: string;
  insurance_id: string | null;
  assistance_id: string | null;
  occurrence_date: string | null;
  reported_date: string | null;
  description: string;
  damage_location: string | null;
  estimated_amount: number | null;
  final_amount: number | null;
  status: ClaimStatus;
  insurer_contact: string | null;
  insurer_claim_ref: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  buildings?: { id: string; code: string; name: string } | null;
  building_insurances?: { id: string; insurer: string | null; policy_number: string | null } | null;
}

export function useInsuranceClaims() {
  return useQuery({
    queryKey: ["insurance-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_claims")
        .select("*, buildings:building_id (id, code, name), building_insurances:insurance_id (id, insurer, policy_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InsuranceClaim[];
    },
  });
}

export function useInsuranceClaim(id: string | null) {
  return useQuery({
    queryKey: ["insurance-claim", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_claims")
        .select("*, buildings:building_id (id, code, name), building_insurances:insurance_id (id, insurer, policy_number)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as InsuranceClaim | null;
    },
  });
}

export function useCreateInsuranceClaim() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<InsuranceClaim> & { building_id: string; description: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("insurance_claims")
        .insert({ ...(input as any), created_by: u.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance-claims"] });
      toast({ title: "Sinistro registado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateInsuranceClaim() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<InsuranceClaim> & { id: string }) => {
      const { data, error } = await supabase
        .from("insurance_claims")
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["insurance-claims"] });
      qc.invalidateQueries({ queryKey: ["insurance-claim", vars.id] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteInsuranceClaim() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: atts } = await supabase
        .from("insurance_claim_attachments")
        .select("file_path").eq("claim_id", id);
      const paths = (atts ?? []).map((a: any) => a.file_path).filter(Boolean);
      if (paths.length > 0) await supabase.storage.from("building-documents").remove(paths);
      const { error } = await supabase.from("insurance_claims").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance-claims"] });
      toast({ title: "Sinistro removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useClaimAttachments(claimId: string | null) {
  return useQuery({
    queryKey: ["claim-attachments", claimId],
    enabled: !!claimId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_claim_attachments")
        .select("*").eq("claim_id", claimId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadClaimAttachment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ claimId, file, kind, description }: {
      claimId: string; file: File; kind?: string; description?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `claims/${claimId}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("building-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from("insurance_claim_attachments").insert({
        claim_id: claimId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || null,
        kind: kind || "outros",
        description: description || null,
        uploaded_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["claim-attachments", vars.claimId] });
      toast({ title: "Anexo carregado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteClaimAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, claimId, filePath }: { id: string; claimId: string; filePath: string }) => {
      await supabase.storage.from("building-documents").remove([filePath]);
      const { error } = await supabase.from("insurance_claim_attachments").delete().eq("id", id);
      if (error) throw error;
      return claimId;
    },
    onSuccess: (claimId) => {
      // qc.invalidateQueries
      // @ts-ignore
      void claimId;
    },
  });
}

export function useClaimNotes(claimId: string | null) {
  return useQuery({
    queryKey: ["claim-notes", claimId],
    enabled: !!claimId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_claim_notes")
        .select("*").eq("claim_id", claimId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddClaimNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ claimId, body }: { claimId: string; body: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("insurance_claim_notes").insert({
        claim_id: claimId, body, author_id: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["claim-notes", vars.claimId] });
    },
  });
}

export async function getClaimAttachmentSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("building-documents")
    .createSignedUrl(filePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
