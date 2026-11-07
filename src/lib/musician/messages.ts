// Plain-language results shown after tapping Apply. The URL carries only a short
// code (?apply=dupe), never free text, so nobody can put words in our mouth.

export const APPLY_MESSAGES: Record<string, { error?: string; message?: string }> = {
  ok: { message: "Applied. The venue can see your profile and will answer here." },
  dupe: { message: "You already applied to that gig. Check Bookings for the answer." },
  closed: { error: "That gig is no longer open. It may have been booked, cancelled or already started." },
  other: { error: "We could not send your application. Please try again." },
};
