import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  instituteId: string | null;
  instituteCode: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, role: null, instituteId: null, instituteCode: null, loading: true, signOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [instituteId, setInstituteId] = useState<string | null>(null);
  const [instituteCode, setInstituteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role, institute_id')
      .eq('user_id', userId)
      .single();
    if (data) {
      setRole(data.role);
      setInstituteId(data.institute_id);
      // Fetch institute code
      if (data.institute_id) {
        const { data: inst } = await supabase
          .from('institutes')
          .select('code')
          .eq('id', data.institute_id)
          .single();
        if (inst) setInstituteCode(inst.code);
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(() => fetchUserRole(session.user.id), 0);
      } else {
        setRole(null);
        setInstituteId(null);
        setInstituteCode(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setInstituteId(null);
    setInstituteCode(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, instituteId, instituteCode, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
