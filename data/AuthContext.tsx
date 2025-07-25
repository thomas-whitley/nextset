import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './supabase-client';

export interface AuthContextType {
  session: Session | null;
  loading: boolean;
  user: User | null;
  signOut: () => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Fetch initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }
        
        console.log('AuthProvider: Initial session:', !!session);
        console.log('AuthProvider: Initial session user:', session?.user?.id);
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          console.log('AuthProvider: Initial session state set');
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Set up listener for subsequent auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log('AuthProvider: Auth state changed:', event, !!currentSession);
        console.log('AuthProvider: New session user:', currentSession?.user?.id);
        
        if (isMounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          // Handle user profile creation/update for all sign-in events
          // Profile creation is now handled by database trigger
          // No need to manually create profiles
          
          if (loading) {
            console.log('AuthProvider: Setting loading to false after auth state change');
            setLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [loading]);


  const signOut = async () => {
    console.log('AuthProvider: Signing out...');
    return await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  console.log('AuthProvider: Rendering with session:', !!session, 'loading:', loading);

  return (
    <AuthContext.Provider value={value}>
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