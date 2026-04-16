import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  building_id: string | null;
  is_global: boolean;
  is_published: boolean;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  buildings?: { id: string; code: string; name: string } | null;
}

export interface KnowledgeFilters {
  search?: string;
  category?: string;
  building_id?: string;
  tags?: string[];
  limit?: number;
  page?: number;
}

export const useKnowledgeArticles = (filters: KnowledgeFilters = {}) => {
  const limit = filters.limit || 50;
  const page = filters.page || 0;
  const from = page * limit;
  const to = from + limit - 1;

  return useQuery({
    queryKey: ["knowledge-articles", filters],
    queryFn: async () => {
      let query = supabase
        .from("knowledge_articles")
        .select("*, buildings(id, code, name)", { count: "exact" })
        .eq("is_published", true)
        .order("title", { ascending: true })
        .range(from, to);

      if (filters.category) {
        query = query.eq("category", filters.category);
      }
      if (filters.building_id) {
        query = query.or(`building_id.eq.${filters.building_id},is_global.eq.true`);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { articles: data as unknown as KnowledgeArticle[], count: count ?? 0 };
    },
  });
};

/** Fetch all category counts (lightweight — no content) */
export const useKnowledgeCategoryCounts = () => {
  return useQuery({
    queryKey: ["knowledge-category-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select("category")
        .eq("is_published", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.category] = (counts[row.category] || 0) + 1;
      }
      return counts;
    },
  });
};

export const useKnowledgeArticle = (id: string) => {
  return useQuery({
    queryKey: ["knowledge-article", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select("*, buildings(id, code, name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as KnowledgeArticle;
    },
    enabled: !!id,
  });
};

export const useCreateKnowledgeArticle = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (article: {
      title: string;
      content: string;
      category: string;
      subcategory?: string;
      tags?: string[];
      building_id?: string | null;
      is_global?: boolean;
      is_published?: boolean;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { metadata: _meta, ...rest } = article;
      const insertData = { ...rest, created_by: user?.id, metadata: (_meta ?? {}) as Record<string, unknown> };
      const { data, error } = await supabase
        .from("knowledge_articles")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-category-counts"] });
      toast({ title: "Artigo criado", description: "O artigo foi criado com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateKnowledgeArticle = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, buildings: _b, ...updates }: Partial<KnowledgeArticle> & { id: string }) => {
      const { metadata: _meta, ...rest } = updates;
      const { data, error } = await supabase
        .from("knowledge_articles")
        .update({ ...rest, ...((_meta !== undefined) ? { metadata: _meta as any } : {}) } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-article"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-category-counts"] });
      toast({ title: "Artigo atualizado", description: "As alterações foram guardadas." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteKnowledgeArticle = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("knowledge_articles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-category-counts"] });
      toast({ title: "Artigo eliminado", description: "O artigo foi removido." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};
