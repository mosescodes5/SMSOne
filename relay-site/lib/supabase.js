import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fails the build/boot loudly and specifically, rather than surfacing as
  // supabase-js's generic "supabaseUrl is required." — that message alone
  // doesn't point at what to actually fix, which matters most on a first
  // deploy where these envs are easy to forget setting in Vercel.
  throw new Error(
    "Missing Supabase config: set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY (Vercel: Project Settings -> " +
      "Environment Variables; local dev: .env.local)."
  );
}

// NEXT_PUBLIC_ vars are safe to expose — the anon key is meant to be public
// (it's rate-limited and RLS-gated on Supabase's side, not a secret).
export const supabase = createClient(url, anonKey);
