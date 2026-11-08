import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Find acts | GiGmate" };

export default function FindActsPage() {
  return (
    <ComingSoon
      title="Find acts"
      body="Search local musicians by genre, availability and rating, then invite them to a slot."
      nextHref="/v/calendar"
      nextLabel="Back to calendar"
    />
  );
}
