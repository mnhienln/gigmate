import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Alerts | GigMate" };

export default function AlertsPage() {
  return (
    <ComingSoon
      title="Alerts"
      body="Updates on your applications and invites will collect here."
      nextHref="/m/bookings"
      nextLabel="See bookings"
    />
  );
}
