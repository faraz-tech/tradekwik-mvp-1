"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { SellerProductDto } from "@tradekwik/shared";
import { deleteProduct, listProducts, updateProduct } from "@/lib/api";
import { priceLabel, stockLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const columnHelper = createColumnHelper<SellerProductDto>();

export default function ProductsPage() {
  const [products, setProducts] = useState<SellerProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    listProducts()
      .then(setProducts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(reload, [reload]);

  async function togglePublish(product: SellerProductDto, next: boolean) {
    setProducts((rows) =>
      rows.map((row) => (row.id === product.id ? { ...row, isPublished: next } : row)),
    );
    try {
      await updateProduct(product.id, { isPublished: next });
    } catch {
      reload();
    }
  }

  async function onDelete(product: SellerProductDto) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    await deleteProduct(product.id).catch(() => undefined);
    reload();
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product",
        cell: (info) => (
          <div>
            <p className="font-medium">{info.getValue()}</p>
            <p className="text-xs text-muted-foreground">/{info.row.original.slug}</p>
          </div>
        ),
      }),
      columnHelper.display({
        id: "price",
        header: "Price",
        cell: ({ row }) => priceLabel(row.original),
      }),
      columnHelper.accessor("stockStatus", {
        header: "Stock",
        cell: (info) => <Badge variant="secondary">{stockLabel[info.getValue()]}</Badge>,
      }),
      columnHelper.accessor("isPublished", {
        header: "Published",
        cell: ({ row }) => (
          <Switch
            checked={row.original.isPublished}
            onCheckedChange={(next) => togglePublish(row.original, next)}
          />
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/products/${row.original.id}/edit`}>Edit</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(row.original)}>
              Delete
            </Button>
          </div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({ data: products, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button asChild>
          <Link href="/products/new">+ Add product</Link>
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No products yet. Add your first product to appear on your storefront.
        </p>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
