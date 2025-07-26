import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type AppSetting = Tables<"app_settings">;

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

export const useUpdateAppSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data, error } = await supabase
        .from("app_settings")
        .update({ value: JSON.stringify(value) })
        .eq("key", key)
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