import type { PublicProductDto } from "@tradekwik/shared";
import { allTiers, formatINR } from "@/lib/format";

/** Quantity-break table for wholesale / bulk pricing. Renders nothing when there are no tiers. */
export function PriceTiers({ product }: { product: PublicProductDto }) {
  if (product.priceOnRequest) return null;
  const tiers = allTiers(product);
  if (tiers.length === 0) return null;

  const rows = tiers.map((tier, i) => {
    const next = tiers[i + 1];
    const range = next ? `${tier.minQty} – ${next.minQty - 1}` : `${tier.minQty}+`;
    return { range, price: tier.price };
  });

  return (
    <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <h2 className="text-sm font-semibold text-stone-900">
        {product.wholesaleOnly ? "Wholesale pricing" : "Bulk pricing"}
      </h2>
      <p className="mt-0.5 text-xs text-stone-600">
        Per-unit price by order quantity.
        {product.wholesaleOnly && ` Minimum order ${tiers[0].minQty} units.`}
      </p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="py-1 font-medium">Quantity</th>
            <th className="py-1 text-right font-medium">Price / unit</th>
          </tr>
        </thead>
        <tbody>
          {!product.wholesaleOnly && product.priceRetail != null && (
            <tr className="border-t border-amber-200/70">
              <td className="py-1.5">1 – {tiers[0].minQty - 1}</td>
              <td className="py-1.5 text-right">{formatINR(product.priceRetail)}</td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.range} className="border-t border-amber-200/70">
              <td className="py-1.5">{row.range}</td>
              <td className="py-1.5 text-right font-medium">{formatINR(row.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
