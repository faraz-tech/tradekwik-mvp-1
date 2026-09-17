import { ProductGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-40 animate-pulse rounded-2xl bg-stone-200" />
      <div className="mt-10 h-6 w-40 animate-pulse rounded bg-stone-200" />
      <div className="mt-4">
        <ProductGridSkeleton count={4} />
      </div>
    </main>
  );
}
