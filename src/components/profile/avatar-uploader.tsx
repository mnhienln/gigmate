"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setAvatar } from "@/app/(musician)/m/media-actions";
import { FormMessage } from "@/components/ui/form-message";
import { MediaError, newObjectPath, prepareImage, uploadObject } from "@/lib/media-client";
import { PHOTOS } from "@/lib/storage";
import { Avatar } from "./avatar";

export function AvatarUploader({ userId, name, path }: { userId: string; name: string; path: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  async function onPick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setDone(false);
    try {
      const blob = await prepareImage(file, 600, 0.85);
      const newPath = newObjectPath(userId, "jpg");
      await uploadObject(PHOTOS, newPath, blob, "image/jpeg");
      const result = await setAvatar(newPath);
      if (result.error) throw new MediaError(result.error);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof MediaError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FormMessage error={error} message={done ? "Profile photo updated." : undefined} />
      <div className="flex items-center gap-4">
        <Avatar name={name} path={path} size={80} />
        <label className="flex min-h-12 cursor-pointer items-center rounded-full border-2 border-ink px-5 font-display text-base uppercase tracking-wide has-[:disabled]:opacity-60">
          {busy ? "Uploading..." : path ? "Change photo" : "Add photo"}
          <input type="file" accept="image/*" onChange={(e) => onPick(e.target.files)} disabled={busy} className="sr-only" />
        </label>
      </div>
    </div>
  );
}
