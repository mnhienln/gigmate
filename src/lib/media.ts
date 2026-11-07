/** A friendly label for a link, from its host: "YouTube", "Spotify", or the bare domain. */
export function linkLabel(url: string): string {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "Listen";
  }
  if (host.includes("youtube") || host === "youtu.be") return "YouTube";
  if (host.includes("spotify")) return "Spotify";
  if (host.includes("soundcloud")) return "SoundCloud";
  if (host.includes("bandcamp")) return "Bandcamp";
  if (host.includes("instagram")) return "Instagram";
  if (host.includes("tiktok")) return "TikTok";
  return host || "Listen";
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
