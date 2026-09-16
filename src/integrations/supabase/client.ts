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

// The URL and publishable key are safe to expose in a browser bundle. Keeping
// them as fallbacks prevents SSR from crashing when a host does not inject
// VITE_* variables at build time (for example, a static preview deployment).
// These public values belong to the production project used by this app.
// Service-role credentials must remain server-only.
const supabaseUrl = rawUrl || "https://isilobzixxxhdfneqqkh.supabase.co";
const supabasePublishableKey =
  rawKey ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzaWxvYnppeHh4aGRmbmVxcWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDIwNjIsImV4cCI6MjA5MjAxODA2Mn0.hIGCKgY4gszGq66EhU4bmFaLg2a5pi4f-NARSvqu0BI";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    !supabaseUrl.includes("placeholder") &&
    !supabaseUrl.includes("example.supabase.co"),
);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
}

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
