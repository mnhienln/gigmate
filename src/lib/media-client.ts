import { createBrowserSupabase } from "@/lib/supabase/client";

/*
  Browser-side helpers that get a photo or video ready to upload.
  Why do this work on the phone: a phone photo is often 5 to 10 MB, which is far
  more than a profile grid needs and more than our server accepts in one request.
  Shrinking to 1600 px and JPEG cuts it to a few hundred KB, which loads fast on
  mobile data. Tradeoff: a little work on the phone before upload.
*/

export class MediaError extends Error {}

export const MAX_IMAGE_INPUT_BYTES = 30 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // matches the 'videos' bucket limit
export const MAX_VIDEO_SECONDS = 60;
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new MediaError("We could not process that picture. Try another one."))), "image/jpeg", quality),
  );
}

/** Shrinks a photo so its longest side is at most maxEdge pixels, and returns a JPEG. */
export async function prepareImage(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new MediaError("Please choose a photo.");
  if (file.size > MAX_IMAGE_INPUT_BYTES) throw new MediaError("That photo is over 30 MB. Pick a smaller one.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new MediaError("We could not read that photo. Try a JPG or PNG.");
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new MediaError("Your browser could not process that photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return toJpeg(canvas, quality);
}

function once(target: HTMLVideoElement, ok: string, ms = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new MediaError("We could not read that video. Try an MP4 from your phone.")), ms);
    target.addEventListener(ok, () => { clearTimeout(timer); resolve(); }, { once: true });
    target.addEventListener("error", () => { clearTimeout(timer); reject(new MediaError("We could not read that video. Try an MP4 from your phone.")); }, { once: true });
  });
}

/** Checks a video against our limits and makes a thumbnail from its first moments. */
export async function prepareVideo(file: File): Promise<{ poster: Blob; seconds: number; ext: string }> {
  const ext = VIDEO_TYPES[file.type];
  if (!ext) throw new MediaError("Please choose an MP4, MOV or WebM video.");
  if (file.size > MAX_VIDEO_BYTES) {
    throw new MediaError(`That video is ${(file.size / 1048576).toFixed(0)} MB. Trim it under 40 MB (about 30 seconds) and try again.`);
  }
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;
    await once(video, "loadedmetadata");
    if (!Number.isFinite(video.duration)) {
      // Some recorders (and WebM files) do not store a length. Jumping to a huge time makes the
      // browser work out the real duration, so we can still enforce the 60 second limit.
      video.currentTime = 1e101;
      await once(video, "timeupdate");
      video.currentTime = 0;
      await once(video, "seeked");
    }
    if (video.duration > MAX_VIDEO_SECONDS) throw new MediaError("Videos can be up to 60 seconds. Trim it and try again.");
    video.currentTime = Math.min(0.5, video.duration / 2 || 0);
    await once(video, "seeked");
    const scale = Math.min(1, 800 / Math.max(video.videoWidth, video.videoHeight, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new MediaError("Your browser could not process that video.");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return { poster: await toJpeg(canvas, 0.8), seconds: Math.round(video.duration), ext };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A fresh file path inside the user's own folder: <user id>/<random id>.<ext> */
export const newObjectPath = (userId: string, ext: string) => `${userId}/${crypto.randomUUID()}.${ext}`;

export async function uploadObject(bucket: string, path: string, body: Blob, contentType: string): Promise<void> {
  const { error } = await createBrowserSupabase().storage.from(bucket).upload(path, body, { contentType, upsert: false, cacheControl: "31536000" });
  if (error) throw new MediaError("The upload did not finish. Check your connection and try again.");
}

/** Best effort cleanup if something fails after a file was uploaded. */
export async function removeObjects(bucket: string, paths: string[]): Promise<void> {
  try {
    await createBrowserSupabase().storage.from(bucket).remove(paths);
  } catch {
    // Nothing more to do; an orphan file costs almost nothing.
  }
}
