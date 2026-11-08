import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatUsd } from "@/lib/money";
import { getMyProfile } from "@/lib/musician/data";
import { getProfileView } from "@/lib/profile/data";
import { PHOTOS, publicUrl } from "@/lib/storage";
import { deletePost, deleteProduct } from "@/app/(musician)/m/media-actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { MusicianProfileForm } from "@/components/musician/profile-form";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ProductForm } from "@/components/profile/product-form";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Edit profile | GigMate" };

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 border-t-2 border-ink px-5 pt-5">
      <div>
        <h2 className="font-display text-2xl uppercase leading-none">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/m/profile/edit">["searchParams"] }) {
  const profile = await requireRole("musician");
  const sp = await searchParams;
  const [me, view] = await Promise.all([getMyProfile(profile.id), getProfileView(profile.id)]);
  if (!view) notFound();

  return (
    <div className="flex flex-col gap-6 pt-5">
      <div className="px-5">
        <Link href="/m/profile" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
          <ChevronLeft size={18} aria-hidden /> Back to profile
        </Link>
        <h1 className="mt-1 font-display text-[36px] uppercase leading-none">Edit profile</h1>
        {sp.removed && <div className="mt-3"><FormMessage message={sp.removed === "post" ? "Post deleted." : "Item removed from your shop."} /></div>}
      </div>

      <Section title="Profile photo">
        <AvatarUploader userId={profile.id} name={view.display_name} path={view.avatar_path} />
      </Section>

      <Section title="Details" hint="Venues see these on your profile and in their requests.">
        <MusicianProfileForm initial={me} />
      </Section>

      <Section title="Posts" hint="Photos and videos show on your profile and in the feed.">
        <Link href="/m/post" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-6 font-display text-lg uppercase tracking-wide text-gold-ink">
          <Plus size={20} strokeWidth={2.5} aria-hidden /> New post
        </Link>
        {view.posts.length === 0 ? (
          <p className="text-base text-ink-muted">No posts yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {view.posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-line p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicUrl(PHOTOS, p.media_type === "video" ? (p.poster_path ?? p.media_path) : p.media_path)} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base">{p.body || (p.media_type === "video" ? "Video" : "Photo")}</p>
                  <p className="font-mono text-[11px] uppercase text-ink-muted">{p.media_type}</p>
                </div>
                <details className="shrink-0">
                  <summary className="flex min-h-11 cursor-pointer items-center px-2 font-mono text-[12px] font-bold uppercase tracking-wide text-brick">Delete</summary>
                  <form action={deletePost.bind(null, p.id)} className="mt-2 w-40">
                    <SubmitButton variant="outline" pendingText="Deleting..." label={`Yes, delete this ${p.media_type}`}>Yes, delete</SubmitButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Shop" hint="Merch fans can buy. The Buy button opens your own store, so GigMate never handles the money.">
        <ProductForm userId={profile.id} />
        {view.products.length > 0 && (
          <ul className="flex flex-col gap-3">
            {view.products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-line p-3">
                {p.photo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicUrl(PHOTOS, p.photo_path)} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-line font-display text-xl uppercase">{p.title.slice(0, 2)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{p.title}</p>
                  <p className="font-mono text-[12px] uppercase text-ink-muted">{formatUsd(p.price_cents)}</p>
                </div>
                <details className="shrink-0">
                  <summary className="flex min-h-11 cursor-pointer items-center px-2 font-mono text-[12px] font-bold uppercase tracking-wide text-brick">Remove</summary>
                  <form action={deleteProduct.bind(null, p.id)} className="mt-2 w-40">
                    <SubmitButton variant="outline" pendingText="Removing..." label={`Yes, remove ${p.title}`}>Yes, remove</SubmitButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <LogoutButton />
    </div>
  );
}

export default function EditProfilePage(props: PageProps<"/m/profile/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
