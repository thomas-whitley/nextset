// App.tsx or a dedicated AuthProvider.tsx
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './supabase'; // Corrected path

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial check for session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, currentSession: Session | null) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        // Set loading to false only after the first auth event or initial session check
        // This prevents a flicker if the user is already logged in.
        if (loading) setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []); // Corrected dependency array to run only on mount and unmount

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
