import type { MetadataRoute } from "next";
import { NAME } from "@/lib/brand";

// Lets todone be added to a phone's home screen, which iOS needs before it allows push notifications.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NAME,
    short_name: NAME,
    start_url: "/app",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#d4f04a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
