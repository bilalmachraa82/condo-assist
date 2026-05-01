import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns whether the current authenticated user has the 'admin' role.
 * Uses the SECURITY DEFINER `has_role` function via a direct user_roles query
 * (the user can read their own roles thanks to RLS).
 */
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) {
        console.warn("useIsAdmin: failed to load role", error);
        return false;
      }
      return !!data;
    },
  });
}
