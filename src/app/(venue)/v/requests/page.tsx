import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Requests | GigMate" };

export default function RequestsPage() {
  return (
    <ComingSoon
      title="Requests"
      body="Musicians who applied to your slots will appear here, ready to compare."
      nextHref="/v/calendar"
      nextLabel="Back to calendar"
    />
  );
}
