import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const DOCUMENT_CATEGORIES = [
  { value: "atas", label: "Atas" },
  { value: "certificados_gas", label: "Certificados de Gás" },
  { value: "certificados_inspecao", label: "Certificados de Inspeção" },
  { value: "orcamentos", label: "Orçamentos" },
  { value: "contratos", label: "Contratos" },
  { value: "seguros", label: "Seguros" },
  { value: "fotos", label: "Fotos" },
  { value: "outros", label: "Outros" },
] as const;

export interface BuildingDocument {
  id: string;
  building_id: string;
  category: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  document_date: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useBuildingDocuments(buildingId?: string | null) {
  return useQuery({
    queryKey: ["building-documents", buildingId],
    enabled: !!buildingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_documents")
        .select("*")
        .eq("building_id", buildingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BuildingDocument[];
    },
  });
}

export function useUploadBuildingDocument() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      buildingId, file, category, title, description, documentDate,
    }: {
      buildingId: string; file: File; category: string;
      title?: string; description?: string; documentDate?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${buildingId}/${category}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("building-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from("building_documents").insert({
        building_id: buildingId,
        category,
        title: title || file.name,
        description: description || null,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        document_date: documentDate || null,
        uploaded_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["building-documents", vars.buildingId] });
      toast({ title: "Documento carregado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteBuildingDocument() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, buildingId, filePath }: { id: string; buildingId: string; filePath: string }) => {
      await supabase.storage.from("building-documents").remove([filePath]);
      const { error } = await supabase.from("building_documents").delete().eq("id", id);
      if (error) throw error;
      return buildingId;
    },
    onSuccess: (buildingId) => {
      qc.invalidateQueries({ queryKey: ["building-documents", buildingId] });
      toast({ title: "Documento removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export async function getBuildingDocumentSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("building-documents")
    .createSignedUrl(filePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadAllBuildingDocumentsAsZip(
  buildingId: string,
  buildingLabel: string
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const { data, error } = await supabase
    .from("building_documents")
    .select("*")
    .eq("building_id", buildingId);
  if (error) throw error;
  const zip = new JSZip();
  for (const doc of data ?? []) {
    const { data: file } = await supabase.storage
      .from("building-documents")
      .download(doc.file_path);
    if (file) {
      const folder = zip.folder(doc.category) ?? zip;
      folder.file(doc.file_name, file);
    }
  }
  return zip.generateAsync({ type: "blob" });
}
