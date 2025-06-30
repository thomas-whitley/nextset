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
          if ((event === 'SIGNED_UP' || event === 'SIGNED_IN') && currentSession?.user) {
            console.log('AuthProvider: Ensuring user profile exists for:', event);
            await ensureUserProfile(currentSession.user);
          }
          
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

  const ensureUserProfile = async (user: User) => {
    try {
      console.log('Ensuring user profile exists for:', user.id);
      console.log('User metadata:', user.user_metadata);
      
      // First check if profile already exists using the correct table name 'profile'
      const { data: existingProfile, error: checkError } = await supabase
        .from('profile')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing profile:', checkError);
        // Continue with creation attempt even if check fails
      }

      if (existingProfile) {
        console.log('User profile already exists, updating if needed');
        
        // Update profile with any new social data
        const socialData = {
          full_name: user.user_metadata?.full_name || user.user_metadata?.name,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        };

        const updateData: any = {};
        if (socialData.full_name) updateData.full_name = socialData.full_name;
        if (socialData.avatar_url) updateData.avatar_url = socialData.avatar_url;

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('profile')
            .update(updateData)
            .eq('id', user.id);

          if (updateError) {
            console.error('Error updating user profile:', updateError);
          } else {
            console.log('User profile updated successfully');
          }
        }
        return;
      }

      // Create new profile using the correct table name 'profile'
      console.log('Creating new user profile');
      
      const profileData = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        username: user.user_metadata?.username || null,
        phone: user.user_metadata?.phone || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        role: 'user' as const,
        is_active: true,
      };

      console.log('Profile data to insert:', profileData);

      const { data: newProfile, error: insertError } = await supabase
        .from('profile')
        .insert(profileData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        
        // If it's a duplicate key error, that's actually fine
        if (insertError.code === '23505') {
          console.log('Profile already exists (duplicate key), this is fine');
          return;
        }
        
        // Don't throw the error to prevent auth flow from breaking
        console.error('Profile creation failed, but continuing with auth flow');
      } else {
        console.log('User profile created successfully:', newProfile);
      }
    } catch (error) {
      console.error('Error in ensureUserProfile:', error);
      // Don't throw the error to prevent auth flow from breaking
    }
  };

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