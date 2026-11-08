"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createPost } from "@/lib/profile/media-actions";
import { TextArea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { MediaError, newObjectPath, prepareImage, prepareVideo, removeObjects, uploadObject } from "@/lib/media-client";
import { PHOTOS, VIDEOS } from "@/lib/storage";

/*
  New post: pick a photo or short video, add a caption, share.
  The file goes from the phone straight to storage (not through our server), then
  createPost() records it. If saving fails after the upload, the files are removed
  so nothing is left orphaned.
*/
export function PostComposer({ userId, doneBase, imageTab, videoTab }: { userId: string; doneBase: string; imageTab: string; videoTab: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function onPick(files: FileList | null) {
    const f = files?.[0] ?? null;
    setError(undefined);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a photo or a video first.");
    setBusy(true);
    setError(undefined);
    const uploaded: { bucket: string; path: string }[] = [];
    try {
      let input: Parameters<typeof createPost>[0];
      if (file.type.startsWith("video/")) {
        const { poster, ext } = await prepareVideo(file);
        const mediaPath = newObjectPath(userId, ext);
        const posterPath = newObjectPath(userId, "jpg");
        await uploadObject(VIDEOS, mediaPath, file, file.type);
        uploaded.push({ bucket: VIDEOS, path: mediaPath });
        await uploadObject(PHOTOS, posterPath, poster, "image/jpeg");
        uploaded.push({ bucket: PHOTOS, path: posterPath });
        input = { mediaType: "video", mediaPath, posterPath, caption };
      } else {
        const blob = await prepareImage(file);
        const mediaPath = newObjectPath(userId, "jpg");
        await uploadObject(PHOTOS, mediaPath, blob, "image/jpeg");
        uploaded.push({ bucket: PHOTOS, path: mediaPath });
        input = { mediaType: "image", mediaPath, caption };
      }
      const result = await createPost(input);
      if (result.error) throw new MediaError(result.error);
      router.push(`${doneBase}?tab=${input.mediaType === "video" ? videoTab : imageTab}&posted=1`);
      router.refresh();
    } catch (err) {
      await Promise.all(uploaded.map((u) => removeObjects(u.bucket, [u.path])));
      setError(err instanceof MediaError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormMessage error={error} />

      <div className="flex flex-col gap-2">
        <label htmlFor="post-file" className="font-mono text-[12px] font-bold uppercase tracking-wide">Photo or video</label>
        <input
          id="post-file"
          type="file"
          accept="image/*,video/mp4,video/quicktime,video/webm"
          onChange={(e) => onPick(e.target.files)}
          disabled={busy}
          className="block w-full rounded-xl border-2 border-dashed border-ink p-3 text-base file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-gold file:px-5 file:font-display file:text-base file:uppercase file:tracking-wide file:text-gold-ink"
        />
        <p className="text-sm text-ink-muted">Photos are shrunk for you. Videos can be up to 60 seconds and 40 MB.</p>
      </div>

      {preview && file && (
        <div className="overflow-hidden rounded-2xl bg-black">
          {file.type.startsWith("video/") ? (
            <video src={preview} controls muted playsInline className="max-h-[50dvh] w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview of your post" className="max-h-[50dvh] w-full object-contain" />
          )}
        </div>
      )}

      <TextArea label="Caption" name="caption" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} disabled={busy} hint="Optional. Up to 300 characters." />

      <button
        type="submit"
        disabled={busy || !file}
        className="flex min-h-14 w-full items-center justify-center rounded-full bg-gold px-8 font-display text-xl uppercase tracking-wide text-gold-ink active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Sharing..." : "Share"}
      </button>
    </form>
  );
}
