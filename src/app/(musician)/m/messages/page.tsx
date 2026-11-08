import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Messages | GiGmate" };

export default function MessagesPage() {
  return (
    <ComingSoon
      title="Messages"
      body="Chat is not part of the first version. For now, apply to a gig and the venue will reach out."
      nextHref="/m/discover"
      nextLabel="Find a gig"
    />
  );
}
