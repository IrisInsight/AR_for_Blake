import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blake's Rocket Reader Challenge",
    short_name: "Rocket Reader",
    description: "Read a book, take the quiz, build the rocket.",
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
