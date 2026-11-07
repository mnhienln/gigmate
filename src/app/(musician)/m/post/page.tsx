import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "New post | GigMate" };

export default function NewPostPage() {
  return (
    <ComingSoon
      title="Share with the scene"
      body="Post a clip or a gig announcement for local musicians and venues to see."
      nextHref="/m/feed"
      nextLabel="Back to feed"
    />
  );
}
