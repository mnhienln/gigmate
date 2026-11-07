import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Discover | GigMate" };

export default function DiscoverPage() {
  return (
    <ComingSoon
      title="Discover gigs"
      body="Open slots near you, filtered by date, genre and pay, will live here."
      nextHref="/m/feed"
      nextLabel="Back to feed"
    />
  );
}
