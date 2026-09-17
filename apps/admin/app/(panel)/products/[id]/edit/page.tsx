"use client";

import { use, useEffect, useState } from "react";
import type { SellerProductDto } from "@tradekwik/shared";
import { listProducts } from "@/lib/api";
import { ProductForm } from "@/components/product-form";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<SellerProductDto | null | undefined>(undefined);

  useEffect(() => {
    listProducts()
      .then((products) => setProduct(products.find((p) => p.id === id) ?? null))
      .catch(() => setProduct(null));
  }, [id]);

  if (product === undefined)
    return <p className="text-sm text-muted-foreground">Loading product…</p>;
  if (product === null) return <p className="text-sm text-red-600">Product not found.</p>;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Edit product</h1>
      <ProductForm product={product} />
    </div>
  );
}
