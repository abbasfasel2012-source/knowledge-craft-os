/**
 * Session management hook for authentication
 */

import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export type UserRole = "owner" | "instructor" | "moderator" | "student";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

export function useSession() {
  const [session, setSession] = useState<{ user: User | null; isLoading: boolean }>({
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    const loadUser = async (authUser: { id: string; email?: string }, loading = false) => {
      if (loading && mounted) setSession((current) => ({ ...current, isLoading: true }));

      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,avatar_url,created_at")
          .eq("id", authUser.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role,created_at")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: true })
          .limit(1),
      ]);

      if (!mounted) return;
      const role = roleRows?.[0]?.role ?? "student";
      setSession({
        user: {
          id: authUser.id,
          email: authUser.email ?? "",
          full_name: profile?.full_name ?? undefined,
          avatar_url: profile?.avatar_url ?? undefined,
          role,
          created_at: profile?.created_at ?? new Date().toISOString(),
        },
        isLoading: false,
      });
    };

    supabase.auth.getSession().then(({ data: { session: authSession } }) => {
      if (authSession?.user) {
        void loadUser(authSession.user, true).catch((error) => {
          console.error("Failed to load user profile", error);
          if (mounted) setSession({ user: null, isLoading: false });
        });
      } else if (mounted) {
        setSession({ user: null, isLoading: false });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (authSession?.user) {
        void loadUser(authSession.user).catch((error) => {
          console.error("Failed to refresh user profile", error);
          if (mounted) setSession({ user: null, isLoading: false });
        });
      } else if (mounted) {
        setSession({ user: null, isLoading: false });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "المالك",
  instructor: "مدرّب",
  moderator: "مشرف",
  student: "متدرب",
};

export function isStaff(role?: UserRole | null) {
  return role === "owner" || role === "instructor" || role === "moderator";
}
