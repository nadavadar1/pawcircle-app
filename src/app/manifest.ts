import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PawCircle — מטיילים עם שם",
    short_name: "PawCircle",
    description: "מטיילים עם שם, לא רק כוכביות.",
    start_url: "/search",
    display: "standalone",
    background_color: "#F3ECDC",
    theme_color: "#1F3B2E",
    dir: "rtl",
    lang: "he",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
