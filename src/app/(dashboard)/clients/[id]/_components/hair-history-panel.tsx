import Link from 'next/link';
import { format } from 'date-fns';
import { ProductChip } from '@/components/products/product-chip';

type HistoryProduct = {
  product: { brand: string; name: string; shadeCode: string | null };
  quantity: number;
  notes: string | null;
};

type VisitEntry = {
  bookingId: string;
  date: Date | string;
  products: HistoryProduct[];
};

interface HairHistoryPanelProps {
  history: VisitEntry[];
}

export function HairHistoryPanel({ history }: HairHistoryPanelProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Hair history</h2>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products logged yet.</p>
      ) : (
        <ul className="space-y-4">
          {history.map((visit) => (
            <li key={visit.bookingId} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {format(new Date(visit.date), 'd MMM yyyy')}
                </span>
                <Link
                  href={`/bookings/${visit.bookingId}`}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  View booking
                </Link>
              </div>

              {visit.products.length === 0 ? (
                <p className="text-xs text-muted-foreground">No products recorded.</p>
              ) : (
                <ul className="space-y-1">
                  {visit.products.map((p, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-1.5 text-sm">
                      <ProductChip
                        brand={p.product.brand}
                        name={p.product.name}
                        shadeCode={p.product.shadeCode}
                      />
                      <span className="text-muted-foreground">× {p.quantity}</span>
                      {p.notes && (
                        <span className="text-xs italic text-muted-foreground">{p.notes}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
