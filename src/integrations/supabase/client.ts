/**
 * Supabase Client Configuration
 * Initializes Supabase connection with proper configuration
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase URL and publishable key are required. Please check your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
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
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" || event === "USER_UPDATED") {
    localStorage.setItem("supabase.auth", JSON.stringify(session));
  } else if (event === "SIGNED_OUT") {
    localStorage.removeItem("supabase.auth");
  }
});
