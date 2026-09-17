import Image from "next/image";
import Link from "next/link";
import type { ProductWithSellerDto, PublicProductDto } from "@tradekwik/shared";
import { firstImage, priceShort, stockLabels } from "@/lib/format";

interface ProductCardProps {
  product: PublicProductDto & Partial<Pick<ProductWithSellerDto, "seller">>;
  /** Needed when product has no embedded seller (store page lists). */
  sellerSlug?: string;
  showSeller?: boolean;
}

export function ProductCard({ product, sellerSlug, showSeller = false }: ProductCardProps) {
  const slug = product.seller?.slug ?? sellerSlug;
  const image = firstImage(product);
  const stock = stockLabels[product.stockStatus];

  return (
    <Link
      href={`/store/${slug}/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-stone-100">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-400">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 font-medium text-stone-900 group-hover:text-blue-700">
          {product.name}
        </h3>
        <p className="text-sm font-semibold text-stone-900">{priceShort(product)}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stock.className}`}>
            {stock.label}
          </span>
          {showSeller && product.seller && (
            <span className="truncate text-xs text-stone-500">
              {product.seller.businessName}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
