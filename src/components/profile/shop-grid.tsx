import { ExternalLink } from "lucide-react";
import { PHOTOS, publicUrl } from "@/lib/storage";
import { formatUsd } from "@/lib/money";
import type { Product } from "@/lib/types";

/* Merch cards, two across. GigMate only SHOWS the items. The Buy button goes to the
   band's own store, so we never touch the money. */
export function ShopGrid({ products, emptyHint }: { products: Product[]; emptyHint: string }) {
  if (products.length === 0) {
    return <p className="mx-5 rounded-2xl border-2 border-dashed border-line p-5 text-base text-ink-muted">{emptyHint}</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 px-5">
      {products.map((p) => (
        <li key={p.id} className="flex flex-col overflow-hidden rounded-2xl border-2 border-ink">
          <div className="aspect-square bg-line">
            {p.photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicUrl(PHOTOS, p.photo_path)} alt={p.title} loading="lazy" decoding="async" className="size-full object-cover" />
            ) : (
              <span aria-hidden className="flex size-full items-center justify-center font-display text-4xl uppercase text-ink-muted">{p.title.slice(0, 2)}</span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <h3 className="break-words text-base font-bold leading-tight">{p.title}</h3>
            <p className="font-display text-xl leading-none">{formatUsd(p.price_cents)}</p>
            {p.description && <p className="line-clamp-3 text-sm text-ink-muted">{p.description}</p>}
            <div className="mt-auto pt-2">
              {p.buy_url ? (
                <a
                  href={p.buy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Buy ${p.title}`}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-gold px-4 font-display text-base uppercase tracking-wide text-gold-ink"
                >
                  Buy <ExternalLink size={14} aria-hidden />
                </a>
              ) : (
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">Ask at the show</p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
