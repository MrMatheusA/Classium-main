import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: string[];
  schools: string[];
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  roles: [],
  schools: [],
  isLoading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn('[AuthProvider] Erro na sessão inicial:', error.message);
        if (error.message?.toLowerCase().includes('jwt issued at future') || error.message?.toLowerCase().includes('jwt')) {
          try {
            await supabase.auth.signOut();
            localStorage.removeItem('educa_plus_supabase_auth_token');
          } catch {}
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      extractClaims(session);
      setIsLoading(false);
    }).catch(async (err) => {
      console.warn('[AuthProvider] Exceção ao obter sessão:', err);
      try {
        await supabase.auth.signOut();
        localStorage.removeItem('educa_plus_supabase_auth_token');
      } catch {}
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      extractClaims(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const extractClaims = (session: Session | null) => {
    if (!session) {
      setRoles([]);
      setSchools([]);
      return;
    }
    // Lendo os Custom Claims injetados pelo Hook do PostgreSQL
    const tokenParts = session.access_token.split('.');
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        setRoles(payload.app_roles || []);
        setSchools(payload.app_schools || []);
      } catch (e) {
        console.error('Erro ao decodificar JWT Claims', e);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, schools, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
