import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed middleware.ts -> proxy.ts (same mechanics, new file
 * name). This refreshes the Supabase auth cookie on every request so
 * Server Components always see a valid session without each of them having
 * to handle token refresh themselves.
 */

// Paths a signed-in user without a profile row is still allowed to reach.
// Everything else assumes onboarding has completed. This is the safety net
// for the emailRedirectTo bug that once stranded confirmed users with no
// profile: whatever page they land on, they get bounced to /onboarding
// instead of silently stuck.
const SKIP_PROFILE_CHECK_PREFIXES = [
  "/onboarding",
  "/auth/callback",
  "/login",
  "/admin",
  "/terms",
  "/privacy",
  "/safety",
  "/api/",
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/opengraph-image",
  "/icon.png",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touch the session so an expired token gets refreshed and rewritten.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const skip = SKIP_PROFILE_CHECK_PREFIXES.some((p) => pathname.startsWith(p));

  if (user && !skip) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
