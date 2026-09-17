/**
 * Supabase Client Configuration
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://qjvcmjqjgnylgboqlufh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdmNtanFqZ255bGdib3FsdWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTQwMDAsImV4cCI6MjEwMzA3MDAwMH0." +
  "EZ-rq8xvGGP7euaOgQT54xEmOUdX3zzVamCnm9e8h2k";

const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL;

const rawKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY;

export const supabaseUrl = rawUrl || SUPABASE_URL;
export const supabasePublishableKey = rawKey || SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    !supabaseUrl.includes("placeholder") &&
    !supabaseUrl.includes("example.supabase.co"),
);

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "tadreeb-auth",
  },
  global: {
    headers: { "Content-Type": "application/json" },
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// مزامنة جلسة المصادقة
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    try {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        localStorage.setItem("tadreeb.auth", JSON.stringify(session));
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("tadreeb.auth");
      }
    } catch {
      // ignore storage errors
    }
  });
}
