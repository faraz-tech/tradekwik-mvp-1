import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-stone-900">Page not found</h1>
      <p className="mt-3 max-w-md text-stone-600">
        The store or product you&apos;re looking for doesn&apos;t exist or is no longer
        available.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800"
      >
        Back to homepage
      </Link>
    </main>
  );
}
