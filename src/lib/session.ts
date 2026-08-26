/**
 * Session management hook for authentication
 */

import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'user';
  created_at: string;
}

export function useSession() {
  const [session, setSession] = useState<{ user: User | null; isLoading: boolean }>({
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session: authSession } }) => {
      if (authSession?.user) {
        // Fetch full user profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', authSession.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setSession({
                user: {
                  id: authSession.user.id,
                  email: authSession.user.email || '',
                  full_name: profile.full_name,
                  avatar_url: profile.avatar_url,
                  role: profile.role,
                  created_at: profile.created_at,
                },
                isLoading: false,
              });
            }
          });
      } else {
        setSession({ user: null, isLoading: false });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, authSession) => {
        if (authSession?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authSession.user.id)
            .single();

          if (profile) {
            setSession({
              user: {
                id: authSession.user.id,
                email: authSession.user.email || '',
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                role: profile.role,
                created_at: profile.created_at,
              },
              isLoading: false,
            });
          }
        } else {
          setSession({ user: null, isLoading: false });
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession({ user: null, isLoading: false });
  };

  return {
    ...session,
    logout,
  };
}
