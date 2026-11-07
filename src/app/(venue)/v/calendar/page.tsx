import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Calendar | GigMate" };

export default function CalendarPage() {
  return (
    <ComingSoon
      title="This week"
      body="Open slots and booked acts will show here. Post a gig to fill an empty night."
      nextHref="/v/find-acts"
      nextLabel="Find acts"
    />
  );
}
