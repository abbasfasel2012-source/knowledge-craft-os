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
// This is the public anon key for the linked project. Deployment environments
// can override it with VITE_SUPABASE_PUBLISHABLE_KEY when available.
const supabaseUrl = rawUrl || "https://qjvcmjqjgnylgboqlufh.supabase.co";
const supabasePublishableKey =
  rawKey ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdmNt anFqZ255bGdib3FsdWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTQwMDAsImV4cCI6MjEwMzA3MDAwMH0.EZ-rq8xvGGP7euaOgQT54xEmOUdX3zzVamCnm9e8h2k".replace(" ", "");

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
