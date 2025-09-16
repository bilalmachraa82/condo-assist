import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { secureLogger } from "@/utils/secureLogger";

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
        secureLogger.debug('Auth state change', { event, userId: session?.user?.id || "no user" });
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setAuthError(null);
        setSessionValidated(false);

        // Debug token expiration and session in dev only
        if (session) {
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const timeToExpiry = expiresAt ? expiresAt - now : 0;
          
          secureLogger.devOnly('Token expires in seconds', timeToExpiry);
          secureLogger.devOnly('Access token length', session.access_token?.length || 0);
          secureLogger.devOnly('User ID', session.user?.id);
          
          // Validate session with a simple query - debounced
          if (!sessionValidated) {
            setTimeout(async () => {
              secureLogger.debug('Starting session validation...');
              const isValid = await validateSessionInternal(session);
              secureLogger.debug('Session validation result', { isValid });
              setSessionValidated(isValid);
              
              if (!isValid) {
                secureLogger.warn('Session validation failed, forcing refresh');
                await refreshSession();
              }
            }, 500);
          }
          
          if (timeToExpiry < 300) { // 5 minutes
            secureLogger.warn('Token expires soon, triggering refresh');
            setTimeout(() => refreshSession(), 1000);
          }
        } else {
          setSessionValidated(false);
        }

        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED') {
          secureLogger.info('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          secureLogger.info('User signed out');
          setAuthError(null);
          setSessionValidated(false);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        secureLogger.debug('Checking existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          secureLogger.error('Error getting session', error);
          setAuthError(error.message);
        } else if (session) {
          secureLogger.info('Found existing session', { userId: session.user.id });
          setSession(session);
          setUser(session.user);
        } else {
          secureLogger.debug('No existing session found');
        }
      } catch (error) {
        secureLogger.error('Auth initialization error', error);
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
        secureLogger.warn('Session lost, attempting refresh...');
        await refreshSession();
      } else if (session && user && !sessionValidated) {
        secureLogger.debug('Re-validating session...');
        const isValid = await validateSessionInternal(session);
        setSessionValidated(isValid);
        
        if (!isValid) {
          secureLogger.warn('Periodic validation failed, forcing refresh');
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
      secureLogger.debug('Validating session with test query...');
      
      // Test auth with a simple query
      const { data, error } = await supabase
        .from('assistances')
        .select('id')
        .limit(1);
      
      if (error) {
        secureLogger.error('Session validation failed', { message: error.message });
        return false;
      }
      
      secureLogger.debug('Session validation successful');
      return true;
    } catch (error) {
      secureLogger.error('Session validation error', error);
      return false;
    }
  };

  const validateSession = async (): Promise<boolean> => {
    return validateSessionInternal(session);
  };

  const refreshSession = async () => {
    try {
      secureLogger.debug('Refreshing session...');
      setLoading(true);
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        secureLogger.error('Session refresh failed', error);
        setAuthError("Sessão expirada. Por favor, faça login novamente.");
        
        toast({
          title: "Sessão Expirada",
          description: "Por favor, faça login novamente para continuar.",
          variant: "destructive",
        });
        
        // Force sign out if refresh fails
        await supabase.auth.signOut();
      } else if (data.session) {
        secureLogger.info('Session refreshed successfully');
        setSession(data.session);
        setUser(data.session.user);
        setAuthError(null);
        
        // Validate the new session
        const isValid = await validateSessionInternal(data.session);
        setSessionValidated(isValid);
      }
    } catch (error) {
      secureLogger.error('Session refresh error', error);
      setAuthError("Erro ao atualizar sessão");
    } finally {
      setLoading(false);
    }
  };

  const forceReauth = async () => {
    try {
      secureLogger.info('Forcing complete re-authentication...');
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
      secureLogger.error('Force reauth error', error);
      setAuthError("Erro ao reautenticar");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Log security event before signing out
      if (user) {
        await supabase.rpc('log_security_event', {
          p_event_type: 'user_logout',
          p_severity: 'low',
          p_details: { user_id: user.id, timestamp: new Date().toISOString() }
        });
      }
      
      secureLogger.info('Signing out...');
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      secureLogger.error('Error signing out', error);
      setAuthError(error instanceof Error ? error.message : 'Erro ao sair');
      
      // Log failed logout attempt
      await supabase.rpc('log_security_event', {
        p_event_type: 'logout_failed',
        p_severity: 'medium',
        p_details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
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