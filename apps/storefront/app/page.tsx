import { getHealth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const health = await getHealth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">TradeKwik</h1>
      <p className="text-lg text-gray-600">
        Storefront scaffold — Phase 1
      </p>
      <div
        className={`rounded-full px-4 py-1.5 text-sm font-medium ${
          health
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        API: {health ? `connected (${health.service})` : "not reachable"}
      </div>
    </main>
  );
}
