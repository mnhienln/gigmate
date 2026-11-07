/*
  Loading placeholder shown while the feed streams in. It is part of the
  prerendered shell, so it appears instantly. Shapes roughly match the real
  layout so the page does not jump when content arrives.
*/
function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-line ${className}`} />;
}

export function FeedSkeleton() {
  return (
    <div role="status" aria-label="Loading feed" className="px-5 pt-5">
      <div className="flex items-center justify-between">
        <Block className="h-10 w-40" />
        <Block className="h-10 w-24" />
      </div>
      <Block className="mt-4 h-5 w-full" />
      <Block className="mt-5 h-[300px] w-full" />
      <div className="mt-6 flex items-center gap-3">
        <Block className="size-12 !rounded-full" />
        <Block className="h-8 w-48" />
      </div>
      <Block className="mt-4 h-[200px] w-full" />
    </div>
  );
}
