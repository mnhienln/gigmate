import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Bookings | GigMate" };

export default function BookingsPage() {
  return (
    <ComingSoon
      title="Your bookings"
      body="Gigs you applied for, confirmed shows and finished sets will show up here."
      nextHref="/m/discover"
      nextLabel="Find a gig"
    />
  );
}
