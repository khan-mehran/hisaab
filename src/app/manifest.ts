import type { MetadataRoute } from "next";

/** Served at /manifest.webmanifest and linked automatically in <head>. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Hisaab",
    short_name: "Hisaab",
    description: "Track salary, expenses and remittances between Qatar and Pakistan.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a1012",
    theme_color: "#6e1423",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
