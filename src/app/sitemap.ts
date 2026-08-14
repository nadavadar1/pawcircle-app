import type { MetadataRoute } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const BASE_URL = "https://pawcircle-app.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await getSupabaseServerClient();

  const { data: walkers } = await supabase
    .from("walker_profiles")
    .select("id, updated_at")
    .eq("status", "approved");

  const walkerEntries: MetadataRoute.Sitemap = (walkers ?? []).map((w) => ({
    url: `${BASE_URL}/walkers/${w.id}`,
    lastModified: w.updated_at,
    changeFrequency: "weekly",
  }));

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/login`, changeFrequency: "monthly", priority: 0.3 },
    ...walkerEntries,
  ];
}
