import type { Metadata, Viewport } from "next";
import "@fontsource/anton/400.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/playfair-display/900-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GiGmate",
  description:
    "Local musicians and venues, connected. Find your next gig or fill an empty night.",
  applicationName: "GiGmate",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b2314",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
