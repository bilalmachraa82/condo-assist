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
  forceReauth: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  authError: null,
  signOut: async () => {},
  refreshSession: async () => {},
  forceReauth: async () => {},
  validateSession: async () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionValidated, setSessionValidated] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔐 Auth state change:", event, session?.user?.id || "no user");
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setAuthError(null);
        setSessionValidated(false);

        // Debug token expiration and session
        if (session) {
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const timeToExpiry = expiresAt ? expiresAt - now : 0;
          
          console.log("🔐 Token expires in:", timeToExpiry, "seconds");
          console.log("🔐 Access token length:", session.access_token?.length || 0);
          console.log("🔐 User ID:", session.user?.id);
          
          // Validate session with a simple query - debounced
          if (!sessionValidated) {
            setTimeout(async () => {
              console.log("🔍 Starting session validation...");
              const isValid = await validateSessionInternal(session);
              console.log("🔍 Session validation result:", isValid);
              setSessionValidated(isValid);
              
              if (!isValid) {
                console.log("⚠️ Session validation failed, forcing refresh");
                await refreshSession();
              }
            }, 500);
          }
          
          if (timeToExpiry < 300) { // 5 minutes
            console.log("⚠️ Token expires soon, triggering refresh");
            setTimeout(() => refreshSession(), 1000);
          }
        } else {
          setSessionValidated(false);
        }

        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log("✅ Token refreshed successfully");
        } else if (event === 'SIGNED_OUT') {
          console.log("🚪 User signed out");
          setAuthError(null);
          setSessionValidated(false);
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

    // Set up periodic session validation - check every 30 seconds
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && user) {
        console.log("⚠️ Session lost, attempting refresh...");
        await refreshSession();
      } else if (session && user && !sessionValidated) {
        console.log("🔍 Re-validating session...");
        const isValid = await validateSessionInternal(session);
        setSessionValidated(isValid);
        
        if (!isValid) {
          console.log("⚠️ Periodic validation failed, forcing refresh");
          await refreshSession();
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, []);  // Remove dependencies to prevent loop

  // Function to validate session by making a test query
  const validateSessionInternal = async (session: Session | null): Promise<boolean> => {
    if (!session) return false;
    
    try {
      console.log("🔍 Validating session with test query...");
      
      // Test auth with a simple query
      const { data, error } = await supabase
        .from('assistances')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error("❌ Session validation failed:", error.message);
        return false;
      }
      
      console.log("✅ Session validation successful");
      return true;
    } catch (error) {
      console.error("❌ Session validation error:", error);
      return false;
    }
  };

  const validateSession = async (): Promise<boolean> => {
    return validateSessionInternal(session);
  };

  const refreshSession = async () => {
    try {
      console.log("🔄 Refreshing session...");
      setLoading(true);
      
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
        
        // Validate the new session
        const isValid = await validateSessionInternal(data.session);
        setSessionValidated(isValid);
      }
    } catch (error) {
      console.error("❌ Session refresh error:", error);
      setAuthError("Erro ao atualizar sessão");
    } finally {
      setLoading(false);
    }
  };

  const forceReauth = async () => {
    try {
      console.log("🔄 Forcing complete re-authentication...");
      setLoading(true);
      setAuthError(null);
      
      // Sign out completely first
      await supabase.auth.signOut();
      
      // Clear all states
      setSession(null);
      setUser(null);
      setSessionValidated(false);
      
      // Force redirect to login
      window.location.href = '/auth';
    } catch (error) {
      console.error("❌ Force reauth error:", error);
      setAuthError("Erro ao reautenticar");
    } finally {
      setLoading(false);
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
    isAuthenticated: !!user && !!session && sessionValidated,
    authError,
    signOut,
    refreshSession,
    forceReauth,
    validateSession,
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