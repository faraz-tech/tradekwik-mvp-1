"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { buyerRegisterSchema } from "@tradekwik/shared";
import { buyerRegister, ClientApiError } from "@/lib/client-api";
import { useBuyerAuth } from "@/components/buyer-auth";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500";

function Field({
  id,
  label,
  errors,
  children,
}: {
  id: string;
  label: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-stone-700">{label}</label>
      {children}
      {errors?.length ? <p className="mt-1 text-xs text-red-600">{errors[0]}</p> : null}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useBuyerAuth();
  const [buyerType, setBuyerType] = useState<"personal" | "business">("personal");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const f = new FormData(event.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim() || undefined;
    const parsed = buyerRegisterSchema.safeParse({
      fullName: str("fullName"),
      phone: str("phone"),
      email: str("email"),
      password: String(f.get("password") ?? ""),
      buyerType,
      companyName: str("companyName"),
      city: str("city"),
      state: str("state"),
    });
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
      return;
    }
    setBusy(true);
    try {
      await buyerRegister(parsed.data);
      await refresh();
      router.replace("/account");
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Could not create the account.");
      if (e instanceof ClientApiError && e.fieldErrors) setFieldErrors(e.fieldErrors);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-stone-900">Create your buyer account</h1>
      <p className="mb-5 mt-1 text-sm text-stone-500">
        Inquiries and orders you already sent from this mobile number are linked automatically.
      </p>
      <form onSubmit={onSubmit} className="grid gap-4">
        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-stone-700">I am buying as</legend>
          <div className="flex gap-4">
            {(["personal", "business"] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm capitalize">
                <input type="radio" name="buyerType" checked={buyerType === v} onChange={() => setBuyerType(v)} /> {v}
              </label>
            ))}
          </div>
        </fieldset>

        <Field id="fullName" label="Your name *" errors={fieldErrors.fullName}>
          <input id="fullName" name="fullName" required className={inputClass} />
        </Field>
        {buyerType === "business" && (
          <Field id="companyName" label="Company / shop name" errors={fieldErrors.companyName}>
            <input id="companyName" name="companyName" className={inputClass} />
          </Field>
        )}
        <Field id="phone" label="Mobile number *" errors={fieldErrors.phone}>
          <input id="phone" name="phone" type="tel" inputMode="numeric" required className={inputClass} placeholder="10-digit mobile" />
        </Field>
        <Field id="email" label="Email" errors={fieldErrors.email}>
          <input id="email" name="email" type="email" className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="city" label="City" errors={fieldErrors.city}>
            <input id="city" name="city" className={inputClass} />
          </Field>
          <Field id="state" label="State" errors={fieldErrors.state}>
            <input id="state" name="state" className={inputClass} />
          </Field>
        </div>
        <Field id="password" label="Password *" errors={fieldErrors.password}>
          <input id="password" name="password" type="password" required minLength={6} className={inputClass} />
        </Field>

        <button type="submit" disabled={busy} className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/account/login" className="font-medium text-blue-700 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
