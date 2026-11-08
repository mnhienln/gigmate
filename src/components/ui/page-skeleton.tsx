/* Generic loading placeholder used while a role check or page streams in. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4 px-5 pt-6">
      <div className="h-10 w-48 animate-pulse rounded-2xl bg-line" />
      <div className="h-5 w-full animate-pulse rounded-2xl bg-line" />
      <div className="h-[220px] w-full animate-pulse rounded-2xl bg-line" />
      <div className="h-[140px] w-full animate-pulse rounded-2xl bg-line" />
    </div>
  );
}
