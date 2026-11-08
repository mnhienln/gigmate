import { initialsOf } from "@/lib/media";
import { PHOTOS, publicUrl } from "@/lib/storage";

/** Round profile photo, or the initials on a mustard circle when there is no photo yet. */
export function Avatar({ name, path, size = 88 }: { name: string; path: string | null; size?: number }) {
  if (path) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={publicUrl(PHOTOS, path)}
        alt={`${name} profile photo`}
        width={size}
        height={size}
        className="shrink-0 rounded-full border-2 border-ink object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-gold font-logo font-black italic text-gold-ink"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initialsOf(name)}
    </span>
  );
}
