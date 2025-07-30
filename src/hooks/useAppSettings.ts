import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type AppSetting = Tables<"app_settings">;

// Optimized hook to get all settings at once
export const useAllAppSettings = () => {
  return useQuery({
    queryKey: ["app-settings-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .order("category, key");
      
      if (error) throw error;
      
      // Group by category for easier access
      const grouped = data.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = {};
        }
        // Parse JSON values safely
        let value = setting.value;
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string if parsing fails
          }
        }
        acc[setting.category][setting.key] = value;
        return acc;
      }, {} as Record<string, Record<string, any>>);
      
      return { raw: data, grouped };
    },
  });
};

// Legacy hook for category-specific queries (kept for backward compatibility)
export const useAppSettings = (category?: string) => {
  return useQuery({
    queryKey: ["app-settings", category],
    queryFn: async () => {
      let query = supabase.from("app_settings").select("*");
      
      if (category) {
        query = query.eq("category", category);
      }
      
      const { data, error } = await query.order("key");
      
      if (error) throw error;
      return data as AppSetting[];
    },
  });
};

// Optimized update mutation with better error handling
export const useUpdateAppSetting = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      // Ensure value is properly stringified
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      const { data, error } = await supabase
        .from("app_settings")
        .update({ 
          value: stringValue,
          updated_at: new Date().toISOString()
        })
        .eq("key", key)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["app-settings-all"] });
      toast({
        title: "Configuração atualizada",
        description: "A configuração foi guardada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Error updating setting:', error);
      toast({
        title: "Erro ao guardar",
        description: error.message || "Não foi possível guardar a configuração.",
        variant: "destructive",
      });
    },
  });
};

export const useCreateAppSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (setting: Omit<AppSetting, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("app_settings")
        .insert({
          ...setting,
          value: JSON.stringify(setting.value)
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });
};

// Helper hook to get a specific setting value
export const useAppSetting = (key: string) => {
  return useQuery({
    queryKey: ["app-setting", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .single();
      
      if (error) throw error;
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    },
  });
};