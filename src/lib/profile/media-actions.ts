"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile, homeFor, type CurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PHOTOS, VIDEOS } from "@/lib/storage";

/*
  Actions for the Instagram-style profiles: posts and the profile photo (musicians AND venues),
  and shop items (venues only). The files themselves are uploaded straight from the phone to storage (see
  media-client.ts). These actions only RECORD them. The browser can send any path,
  so each action re-checks that the path is inside the caller's own folder and has
  the shape we generate. The database repeats the same checks.
*/

export type ActionResult = { error?: string };

const FAILED = "We could not save that. Please try again in a moment.";
const MAX_POSTS = 100;
const MAX_PRODUCTS = 24;

/** Musicians and venues both have a profile with photos and videos. Returns who is calling. */
async function requireOwner(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.onboarded_at || (profile.role !== "musician" && profile.role !== "venue")) redirect(homeFor(profile.role));
  return profile;
}

/** The shop belongs to venues. (The database insert rule says the same thing in migration 0006.) */
async function requireVenue(): Promise<CurrentProfile> {
  const profile = await requireOwner();
  if (profile.role !== "venue") redirect(homeFor(profile.role));
  return profile;
}

const editPath = (profile: CurrentProfile) => (profile.role === "venue" ? "/v/profile/edit" : "/m/profile/edit");

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const pathOf = (ownerId: string, exts: string) => new RegExp(`^${ownerId}/${UUID}\\.(${exts})$`);

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------
const postSchema = z.object({
  mediaType: z.enum(["image", "video"]),
  mediaPath: z.string().max(200),
  posterPath: z.string().max(200).optional(),
  caption: z.string().trim().max(300, "Keep the caption under 300 characters."),
});

export async function createPost(input: z.input<typeof postSchema>): Promise<ActionResult> {
  const profile = await requireOwner();
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const mediaOk = d.mediaType === "image" ? pathOf(profile.id, "jpg").test(d.mediaPath) : pathOf(profile.id, "mp4|mov|webm").test(d.mediaPath);
  const posterOk = d.mediaType === "video" ? Boolean(d.posterPath && pathOf(profile.id, "jpg").test(d.posterPath)) : !d.posterPath;
  if (!mediaOk || !posterOk) return { error: FAILED };

  const supabase = await createClient();
  const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", profile.id).not("media_path", "is", null);
  if ((count ?? 0) >= MAX_POSTS) return { error: `You have reached ${MAX_POSTS} posts. Delete an old one to add more.` };

  const { error } = await supabase.from("posts").insert({
    author_id: profile.id,
    kind: "announcement",
    body: d.caption,
    media_path: d.mediaPath,
    media_type: d.mediaType,
    poster_path: d.mediaType === "video" ? d.posterPath : null,
  });
  return error ? { error: FAILED } : {};
}

export async function deletePost(postId: string): Promise<void> {
  const profile = await requireOwner();
  if (!z.uuid().safeParse(postId).success) redirect(editPath(profile));

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id, media_path, media_type, poster_path")
    .eq("id", postId)
    .eq("author_id", profile.id)
    .maybeSingle();
  if (post) {
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", profile.id);
    if (!error) {
      // Best effort: remove the files too so we do not keep unused uploads.
      if (post.media_path) await supabase.storage.from(post.media_type === "video" ? VIDEOS : PHOTOS).remove([post.media_path]);
      if (post.poster_path) await supabase.storage.from(PHOTOS).remove([post.poster_path]);
    }
  }
  redirect(`${editPath(profile)}?removed=post`);
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------
const productSchema = z.object({
  title: z.string().trim().min(1, "Give the item a name.").max(80, "Keep the name under 80 characters."),
  price: z.coerce.number({ message: "Enter a price in dollars." }).min(0, "A price cannot be negative.").max(10000, "That price looks too high."),
  description: z.string().trim().max(300, "Keep the description under 300 characters.").optional(),
  buyUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.url({ protocol: /^https?$/, message: "Paste a full link that starts with https://" }).optional()),
  photoPath: z.string().max(200).optional(),
});

export async function createProduct(input: z.input<typeof productSchema>): Promise<ActionResult> {
  const profile = await requireVenue();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.photoPath && !pathOf(profile.id, "jpg").test(d.photoPath)) return { error: FAILED };

  const supabase = await createClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("owner_id", profile.id);
  if ((count ?? 0) >= MAX_PRODUCTS) return { error: `Your shop is full at ${MAX_PRODUCTS} items. Remove one to add another.` };

  const { error } = await supabase.from("products").insert({
    owner_id: profile.id,
    title: d.title,
    price_cents: Math.round(d.price * 100),
    description: d.description || null,
    buy_url: d.buyUrl ?? null,
    photo_path: d.photoPath ?? null,
  });
  return error ? { error: FAILED } : {};
}

export async function deleteProduct(productId: string): Promise<void> {
  const profile = await requireVenue();
  if (!z.uuid().safeParse(productId).success) redirect("/v/profile/edit");

  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("id, photo_path").eq("id", productId).eq("owner_id", profile.id).maybeSingle();
  if (product) {
    const { error } = await supabase.from("products").delete().eq("id", productId).eq("owner_id", profile.id);
    if (!error && product.photo_path) await supabase.storage.from(PHOTOS).remove([product.photo_path]);
  }
  redirect("/v/profile/edit?removed=product");
}

// ---------------------------------------------------------------------------
// Profile photo
// ---------------------------------------------------------------------------
export async function setAvatar(path: string): Promise<ActionResult> {
  const profile = await requireOwner();
  if (!pathOf(profile.id, "jpg").test(path)) return { error: FAILED };

  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("avatar_url").eq("id", profile.id).maybeSingle();
  const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", profile.id);
  if (error) return { error: FAILED };
  if (before?.avatar_url && before.avatar_url !== path) await supabase.storage.from(PHOTOS).remove([before.avatar_url]);
  return {};
}
