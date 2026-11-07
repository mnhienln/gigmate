import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Profile | GigMate" };

export default function ProfilePage() {
  return (
    <ComingSoon
      title="Your press kit"
      body="Photos, audio and video links, genres, rate range and reviews will live here."
      nextHref="/m/feed"
      nextLabel="Back to feed"
    />
  );
}
