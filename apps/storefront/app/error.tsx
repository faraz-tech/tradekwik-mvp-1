"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-stone-900">Something went wrong</h1>
      <p className="mt-3 max-w-md text-stone-600">
        We couldn&apos;t load this page. It&apos;s usually temporary — please try again in a
        moment.
      </p>
      <button
        onClick={reset}
        className="mt-8 rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800"
      >
        Try again
      </button>
    </main>
  );
}
