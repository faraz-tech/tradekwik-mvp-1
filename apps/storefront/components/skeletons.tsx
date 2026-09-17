function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-stone-200" />
      <div className="grid gap-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-stone-200" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-8 w-64 animate-pulse rounded bg-stone-200" />
      <div className="mt-2 h-4 w-40 animate-pulse rounded bg-stone-200" />
      <div className="mt-6">
        <ProductGridSkeleton />
      </div>
    </main>
  );
}
