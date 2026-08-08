import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for use in Client Components. Cookie-backed so the
 * session set by /auth/callback (magic link) is visible here too. */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY env vars."
    );
  }

  return createBrowserClient(url, anonKey);
}
