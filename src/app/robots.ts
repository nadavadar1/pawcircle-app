import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/my-bookings", "/profile/edit", "/onboarding", "/auth/callback"],
    },
    sitemap: "https://pawcircle-app.vercel.app/sitemap.xml",
  };
}
