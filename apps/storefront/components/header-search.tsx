"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SearchInput() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  return (
    <input
      key={q}
      type="search"
      name="q"
      defaultValue={q}
      placeholder="Search products, machines, services…"
      className="w-full rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
    />
  );
}

export function HeaderSearch() {
  return (
    <form action="/search" className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-md">
      <Suspense
        fallback={
          <input
            type="search"
            name="q"
            placeholder="Search products, machines, services…"
            className="w-full rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
          />
        }
      >
        <SearchInput />
      </Suspense>
    </form>
  );
}
