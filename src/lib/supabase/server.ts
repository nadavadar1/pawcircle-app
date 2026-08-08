import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components / Route Handlers / Server Actions.
 * Must be created fresh per request (never module-level singleton) since it
 * reads the current request's cookies.
 *
 * Setting cookies only works from a Route Handler or Server Action — when
 * called from a plain Server Component render, `setAll` below will throw,
 * which is caught and ignored (the proxy.ts session refresh covers that
 * case instead, per the Supabase SSR guidance baked into createServerClient's
 * own JSDoc).
 */
export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY env vars."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component render — proxy.ts refreshes the
          // session instead. Safe to ignore here.
        }
      },
    },
  });
}
