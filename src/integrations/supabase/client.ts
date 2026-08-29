/**
 * Supabase Client Configuration
 * Initializes Supabase connection with proper configuration
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const rawUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const rawKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  rawUrl && rawKey && !rawUrl.includes("placeholder") && !rawUrl.includes("example.supabase.co"),
);

const supabaseUrl = rawUrl || "https://demo-training-platform.supabase.co";
const supabasePublishableKey =
  rawKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_preview";

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      "Content-Type": "application/json",
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Setup auth state persistence
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    try {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        localStorage.setItem("supabase.auth", JSON.stringify(session));
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("supabase.auth");
      }
    } catch {
      // ignore storage errors
    }
  });
}
