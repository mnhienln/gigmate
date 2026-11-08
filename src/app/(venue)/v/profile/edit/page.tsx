import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getVenueProfile } from "@/lib/venue/data";
import { getVenueProfileView } from "@/lib/profile/data";
import { LogoutButton } from "@/components/auth/logout-button";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { EditSection } from "@/components/profile/edit-section";
import { ManagePosts } from "@/components/profile/manage-posts";
import { ManageShop } from "@/components/profile/manage-shop";
import { ProductForm } from "@/components/profile/product-form";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { VenueProfileForm } from "@/components/venue/profile-form";

export const metadata = { title: "Edit venue profile | GigMate" };

async function Content({ searchParams }: { searchParams: PageProps<"/v/profile/edit">["searchParams"] }) {
  const profile = await requireRole("venue");
  const sp = await searchParams;
  const [venue, view] = await Promise.all([getVenueProfile(profile.id), getVenueProfileView(profile.id)]);
  if (!view) notFound();

  return (
    <div className="flex flex-col gap-6 pt-5">
      <div className="px-5">
        <Link href="/v/profile" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
          <ChevronLeft size={18} aria-hidden /> Back to profile
        </Link>
        <h1 className="mt-1 font-display text-[36px] uppercase leading-none">Edit profile</h1>
        {sp.removed && <div className="mt-3"><FormMessage message={sp.removed === "post" ? "Post deleted." : "Item removed from your shop."} /></div>}
      </div>

      <EditSection title="Profile photo">
        <AvatarUploader userId={profile.id} name={view.display_name} path={view.avatar_path} />
      </EditSection>

      <EditSection title="Details" hint="Musicians see these on your profile and on your gig tickets.">
        <VenueProfileForm
          initial={{
            display_name: venue.display_name,
            neighborhood: venue.neighborhood,
            venue_type: venue.venue_type,
            capacity: venue.capacity,
            has_pa: venue.has_pa,
            stage_notes: venue.stage_notes,
            address: venue.address,
          }}
        />
      </EditSection>

      <EditSection title="Photos and videos" hint="Show off the room. Photos and videos appear on your profile.">
        <Link href="/v/post" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-6 font-display text-lg uppercase tracking-wide text-gold-ink">
          <Plus size={20} strokeWidth={2.5} aria-hidden /> New post
        </Link>
        <ManagePosts posts={view.posts} />
      </EditSection>

      <EditSection title="Shop" hint="Merch like shirts, glasses or gift cards. The Buy button opens your own store, so GigMate never handles the money.">
        <ProductForm userId={profile.id} />
        <ManageShop products={view.products} />
      </EditSection>

      <LogoutButton />
    </div>
  );
}

export default function EditVenueProfilePage(props: PageProps<"/v/profile/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
