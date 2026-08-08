import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Cold visitors (not logged in) land on the marketing site, which already
 * explains what PawCircle is — landing here on an empty /search with no
 * context would be a worse first impression. Logged-in users skip straight
 * to search since they've already been sold on the concept. */
export default async function Home() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/search" : "https://nadavadar1.github.io/pawcircle-landing/");
}
