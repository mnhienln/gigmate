// Where uploaded files live. Both buckets are public-read, so a plain <img> or <video> works.
export const PHOTOS = "photos"; // photos, avatars, product pictures, video thumbnails
export const VIDEOS = "videos"; // short video posts

/** Public web address of a stored file. The path always starts with the owner's user id. */
export function publicUrl(bucket: string, path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
