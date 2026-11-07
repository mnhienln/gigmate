import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Venue profile | GigMate" };

export default function VenueProfilePage() {
  return (
    <ComingSoon
      title="Your venue"
      body="Photos, capacity, stage and PA details, address and reviews will live here."
      nextHref="/v/calendar"
      nextLabel="Back to calendar"
    />
  );
}
