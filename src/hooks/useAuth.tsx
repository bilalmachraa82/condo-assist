import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  authError: null,
  signOut: async () => {},
  refreshSession: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("🔐 Auth state change:", event, session?.user?.id || "no user");
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setAuthError(null);

        // Debug token expiration
        if (session) {
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const timeToExpiry = expiresAt ? expiresAt - now : 0;
          
          console.log("🔐 Token expires in:", timeToExpiry, "seconds");
          
          if (timeToExpiry < 60) {
            console.log("⚠️ Token expires soon, triggering refresh");
            setTimeout(() => refreshSession(), 1000);
          }
        }

        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log("✅ Token refreshed successfully");
        } else if (event === 'SIGNED_OUT') {
          console.log("🚪 User signed out");
          setAuthError(null);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        console.log("🔐 Checking existing session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("❌ Error getting session:", error);
          setAuthError(error.message);
        } else if (session) {
          console.log("✅ Found existing session for user:", session.user.id);
          setSession(session);
          setUser(session.user);
        } else {
          console.log("ℹ️ No existing session found");
        }
      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        setAuthError("Erro ao inicializar autenticação");
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up periodic session validation
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && user) {
        console.log("⚠️ Session lost, attempting refresh...");
        await refreshSession();
      }
    }, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, []);

  const refreshSession = async () => {
    try {
      console.log("🔄 Refreshing session...");
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("❌ Session refresh failed:", error);
        setAuthError("Sessão expirada. Por favor, faça login novamente.");
        
        toast({
          title: "Sessão Expirada",
          description: "Por favor, faça login novamente para continuar.",
          variant: "destructive",
        });
        
        // Force sign out if refresh fails
        await supabase.auth.signOut();
      } else if (data.session) {
        console.log("✅ Session refreshed successfully");
        setSession(data.session);
        setUser(data.session.user);
        setAuthError(null);
      }
    } catch (error) {
      console.error("❌ Session refresh error:", error);
      setAuthError("Erro ao atualizar sessão");
    }
  };

  const signOut = async () => {
    console.log("🚪 Signing out...");
    setLoading(true);
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user && !!session,
    authError,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};