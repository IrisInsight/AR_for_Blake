import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blake's Reading Jackpot",
    short_name: "Jackpot",
    description: "Every minute you read is a spin. Every spin pays points.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b1230",
    theme_color: "#0b1230",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
