export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-4 w-56 animate-pulse rounded bg-stone-200" />
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="aspect-[4/3] animate-pulse rounded-xl bg-stone-200" />
        <div className="grid content-start gap-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-stone-200" />
          <div className="h-6 w-1/2 animate-pulse rounded bg-stone-200" />
          <div className="mt-4 h-12 w-full animate-pulse rounded-full bg-stone-200" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-stone-200" />
        </div>
      </div>
    </main>
  );
}
