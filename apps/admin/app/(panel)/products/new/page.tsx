"use client";

import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Add product</h1>
      <ProductForm />
    </div>
  );
}
