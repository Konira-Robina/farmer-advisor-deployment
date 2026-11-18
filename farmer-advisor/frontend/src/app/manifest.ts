import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Farmer Advisor",
    short_name: "Advisor",
    description: "Planting, weather, soil and pest advice for farmers in Uganda.",
    start_url: "/today",
    display: "standalone",
    background_color: "#f2f6ef",
    theme_color: "#123a21",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
