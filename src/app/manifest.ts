import type { MetadataRoute } from "next";

/*
  Makes the site installable ("Add to Home Screen"). Home-screen icons
  (192 and 512 px PNG) still need to be added to /public before the install
  prompt is reliable; tracked in CLAUDE.md.
*/
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GiGmate",
    short_name: "GiGmate",
    description: "Local musicians and venues, connected.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6e5bc",
    theme_color: "#3b2314",
  };
}
