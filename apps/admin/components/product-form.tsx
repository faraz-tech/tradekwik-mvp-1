"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  createProductSchema,
  STOCK_STATUSES,
  type CategoryDto,
  type ProductMediaItem,
  type SellerProductDto,
} from "@tradekwik/shared";
import { createProduct, updateProduct, uploadImage, ApiFetchError, getCategories } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormInput = z.input<typeof createProductSchema>;
type FormOutput = z.output<typeof createProductSchema>;

interface SpecRow {
  key: string;
  value: string;
}

const stockLabels: Record<(typeof STOCK_STATUSES)[number], string> = {
  in_stock: "In stock",
  made_to_order: "Made to order",
  out_of_stock: "Out of stock",
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

const optionalNumber = { setValueAs: (v: unknown) => (v === "" || v == null ? undefined : v) };

export function ProductForm({ product }: { product?: SellerProductDto }) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [specs, setSpecs] = useState<SpecRow[]>(
    product ? Object.entries(product.specs).map(([key, value]) => ({ key, value })) : [],
  );
  const [media, setMedia] = useState<ProductMediaItem[]>(product?.media ?? []);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const videoUrlRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          description: product.description ?? undefined,
          specs: product.specs,
          priceRetail: product.priceRetail ?? undefined,
          priceBulk: product.priceBulk ?? undefined,
          minBulkQty: product.minBulkQty ?? undefined,
          priceOnRequest: product.priceOnRequest,
          stockStatus: product.stockStatus,
          media: product.media,
          isPublished: product.isPublished,
          seoTitle: product.seoTitle ?? undefined,
          seoDescription: product.seoDescription ?? undefined,
        }
      : { specs: {}, media: [], priceOnRequest: false, isPublished: false, stockStatus: "in_stock" },
  });

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // keep RHF in sync with the dynamic editors
  useEffect(() => {
    const record: Record<string, string> = {};
    for (const row of specs) {
      if (row.key.trim() && row.value.trim()) record[row.key.trim()] = row.value.trim();
    }
    setValue("specs", record);
  }, [specs, setValue]);

  useEffect(() => {
    setValue("media", media);
  }, [media, setValue]);

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setServerError(null);
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploadImage(file);
        setMedia((items) => [...items, { type: "image", url, alt: file.name }]);
      }
    } catch (error) {
      setServerError(error instanceof ApiFetchError ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function addVideoUrl() {
    const url = videoUrlRef.current?.value.trim();
    if (!url) return;
    setMedia((items) => [...items, { type: "video", url }]);
    if (videoUrlRef.current) videoUrlRef.current.value = "";
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (product) {
        await updateProduct(product.id, values);
      } else {
        await createProduct(values);
      }
      router.push("/products");
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof ApiFetchError ? error.message : "Could not save the product.",
      );
    }
  });

  const fieldError = (name: keyof FormInput) =>
    errors[name] ? <p className="text-xs text-red-600">{String(errors[name]?.message)}</p> : null;

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-6">
      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Product name *</Label>
            <Input id="name" {...register("name")} />
            {fieldError("name")}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="categoryId">Category *</Label>
              <select id="categoryId" className={selectClass} {...register("categoryId")}>
                <option value="">Select category…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldError("categoryId")}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stockStatus">Stock status</Label>
              <select id="stockStatus" className={selectClass} {...register("stockStatus")}>
                {STOCK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {stockLabels[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} {...register("description")} />
            {fieldError("description")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="priceRetail">Retail price (₹)</Label>
              <Input id="priceRetail" type="number" min={0} {...register("priceRetail", optionalNumber)} />
              {fieldError("priceRetail")}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="priceBulk">Bulk price (₹)</Label>
              <Input id="priceBulk" type="number" min={0} {...register("priceBulk", optionalNumber)} />
              {fieldError("priceBulk")}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="minBulkQty">Min bulk qty</Label>
              <Input id="minBulkQty" type="number" min={1} {...register("minBulkQty", optionalNumber)} />
              {fieldError("minBulkQty")}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" {...register("priceOnRequest")} />
            Price on request (hide prices, buyers must inquire)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Specifications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {specs.map((row, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="e.g. Motor power"
                value={row.key}
                onChange={(e) =>
                  setSpecs((rows) => rows.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)))
                }
              />
              <Input
                placeholder="e.g. 250 W"
                value={row.value}
                onChange={(e) =>
                  setSpecs((rows) => rows.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSpecs((rows) => rows.filter((_, i) => i !== index))}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => setSpecs((rows) => [...rows, { key: "", value: "" }])}
          >
            + Add specification
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos & video</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-3">
            {media.map((item, index) => (
              <div key={`${item.url}-${index}`} className="relative">
                {item.type === "image" ? (
                  <div className="relative h-20 w-24 overflow-hidden rounded-md border bg-muted">
                    <Image src={item.url} alt={item.alt ?? ""} fill sizes="96px" className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="flex h-20 w-24 items-center justify-center rounded-md border bg-muted text-2xl">
                    🎬
                  </div>
                )}
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => setMedia((items) => items.filter((_, i) => i !== index))}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor="file-upload" className="mb-1.5 block">
              Upload images (max 5 MB each)
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              disabled={uploading}
              onChange={(e) => onFilesSelected(e.target.files)}
            />
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
          </div>
          <div className="flex gap-2">
            <Input ref={videoUrlRef} placeholder="Video URL (YouTube/MP4) — great for machines" />
            <Button type="button" variant="outline" onClick={addVideoUrl}>
              Add video
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO (optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="seoTitle">SEO title</Label>
            <Input id="seoTitle" {...register("seoTitle")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="seoDescription">SEO description</Label>
            <Textarea id="seoDescription" rows={2} {...register("seoDescription")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="slug">URL slug</Label>
            <Input id="slug" placeholder="auto-generated from name" {...register("slug", { setValueAs: (v: unknown) => (v === "" ? undefined : v) })} />
            {fieldError("slug")}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4" {...register("isPublished")} />
          Published (visible on your storefront)
        </label>
        <Button type="submit" disabled={isSubmitting || uploading} className="ml-auto">
          {isSubmitting ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
