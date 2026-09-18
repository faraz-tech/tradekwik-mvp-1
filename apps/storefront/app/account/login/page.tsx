"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { z } from "zod";
import { buyerLoginSchema } from "@tradekwik/shared";
import { buyerLogin, ClientApiError } from "@/lib/client-api";
import { useBuyerAuth } from "@/components/buyer-auth";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { refresh } = useBuyerAuth();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const parsed = buyerLoginSchema.safeParse({
      phone: String(form.get("phone") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
      return;
    }
    setBusy(true);
    try {
      await buyerLogin(parsed.data);
      await refresh();
      router.replace(search.get("next") || "/account");
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-stone-700">Mobile number</label>
        <input id="phone" name="phone" type="tel" inputMode="numeric" required className={inputClass} placeholder="10-digit mobile" />
        {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone[0]}</p>}
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-stone-700">Password</label>
        <input id="password" name="password" type="password" required className={inputClass} />
        {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password[0]}</p>}
      </div>
      <button type="submit" disabled={busy} className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
        {busy ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-stone-900">Log in to TradeKwik</h1>
      <p className="mb-5 mt-1 text-sm text-stone-500">Track your inquiries, orders and deliveries in one place.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-5 text-sm text-stone-600">
        New here?{" "}
        <Link href="/account/register" className="font-medium text-blue-700 hover:underline">
          Create a buyer account
        </Link>
      </p>
    </div>
  );
}
