import { deleteProduct } from "@/lib/profile/media-actions";
import { formatUsd } from "@/lib/money";
import { PHOTOS, publicUrl } from "@/lib/storage";
import type { Product } from "@/lib/types";
import { SubmitButton } from "@/components/ui/submit-button";

/* A venue's shop items with a two-step Remove. */
export function ManageShop({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3">
      {products.map((p) => (
        <li key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-line p-3">
          {p.photo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={publicUrl(PHOTOS, p.photo_path)} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
          ) : (
            <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-line font-display text-xl uppercase">{p.title.slice(0, 2)}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">{p.title}</p>
            <p className="font-mono text-[12px] uppercase text-ink-muted">{formatUsd(p.price_cents)}</p>
          </div>
          <details className="shrink-0">
            <summary className="flex min-h-11 cursor-pointer items-center px-2 font-mono text-[12px] font-bold uppercase tracking-wide text-brick">Remove</summary>
            <form action={deleteProduct.bind(null, p.id)} className="mt-2 w-40">
              <SubmitButton variant="outline" pendingText="Removing..." label={`Yes, remove ${p.title}`}>Yes, remove</SubmitButton>
            </form>
          </details>
        </li>
      ))}
    </ul>
  );
}
