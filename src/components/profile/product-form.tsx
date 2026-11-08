"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { createProduct } from "@/app/(musician)/m/media-actions";
import { Field, TextArea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { MediaError, newObjectPath, prepareImage, removeObjects, uploadObject } from "@/lib/media-client";
import { PHOTOS } from "@/lib/storage";

/* Add a shop item: name, price, optional photo, description and buy link.
   GigMate shows the item; the Buy button goes to the band's own store. */
export function ProductForm({ userId }: { userId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    setDone(false);
    let photoPath: string | undefined;
    try {
      const photo = form.get("photo");
      if (photo instanceof File && photo.size > 0) {
        const blob = await prepareImage(photo, 1200, 0.82);
        photoPath = newObjectPath(userId, "jpg");
        await uploadObject(PHOTOS, photoPath, blob, "image/jpeg");
      }
      const result = await createProduct({
        title: String(form.get("title") ?? ""),
        price: String(form.get("price") ?? ""),
        description: String(form.get("description") ?? ""),
        buyUrl: String(form.get("buyUrl") ?? ""),
        photoPath,
      });
      if (result.error) throw new MediaError(result.error);
      formRef.current?.reset();
      setDone(true);
      router.refresh();
    } catch (err) {
      if (photoPath) await removeObjects(PHOTOS, [photoPath]);
      setError(err instanceof MediaError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormMessage error={error} message={done ? "Added to your shop." : undefined} />
      <Field label="Item name" name="title" required maxLength={80} placeholder="Tour tee, vinyl, stickers" />
      <Field label="Price ($)" name="price" type="number" inputMode="decimal" min={0} step="0.01" required />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-photo" className="font-mono text-[12px] font-bold uppercase tracking-wide">Photo</label>
        <input
          id="f-photo"
          name="photo"
          type="file"
          accept="image/*"
          className="block w-full rounded-xl border-2 border-dashed border-ink p-3 text-base file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-gold file:px-5 file:font-display file:text-base file:uppercase file:tracking-wide file:text-gold-ink"
        />
      </div>
      <TextArea label="Description" name="description" maxLength={300} hint="Optional. Sizes, colors, pressing details." />
      <Field label="Buy link" name="buyUrl" type="url" inputMode="url" placeholder="https://" hint="Optional. Your Bandcamp, Shopify or payment page. With no link, it says 'Ask at the show'." />
      <button
        type="submit"
        disabled={busy}
        className="flex min-h-14 w-full items-center justify-center rounded-full bg-gold px-8 font-display text-xl uppercase tracking-wide text-gold-ink active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Adding..." : "Add to shop"}
      </button>
    </form>
  );
}
