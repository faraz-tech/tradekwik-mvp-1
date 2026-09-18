"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { BuyerProfileDto } from "@tradekwik/shared";
import { ClientApiError, getBuyerProfile, updateBuyerProfile } from "@/lib/client-api";
import { useBuyerAuth } from "@/components/buyer-auth";
import { BuyerVerification } from "@/components/account/buyer-verification";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500";

const verificationLabel = {
  unverified: { label: "Not verified", className: "bg-stone-200 text-stone-700" },
  phone_verified: { label: "Phone verified", className: "bg-blue-100 text-blue-800" },
  review_pending: { label: "Verification under review", className: "bg-amber-100 text-amber-800" },
  business_verified: { label: "Verified business buyer", className: "bg-green-100 text-green-800" },
} as const;

export default function AccountProfilePage() {
  const { refresh } = useBuyerAuth();
  const [profile, setProfile] = useState<BuyerProfileDto | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBuyerProfile().then(setProfile).catch(() => setStatus("Could not load your profile."));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const f = new FormData(event.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim() || null;
    setBusy(true);
    try {
      const updated = await updateBuyerProfile({
        fullName: String(f.get("fullName") ?? "").trim(),
        email: str("email"),
        buyerType: String(f.get("buyerType") ?? "personal") as "personal" | "business",
        companyName: str("companyName"),
        gstin: str("gstin"),
        city: str("city"),
        state: str("state"),
        defaultAddress: str("defaultAddress"),
      });
      setProfile(updated);
      await refresh();
      setStatus("Saved.");
    } catch (e) {
      setStatus(e instanceof ClientApiError ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <p className="text-sm text-stone-500">{status ?? "Loading…"}</p>;
  const v = verificationLabel[profile.verificationStatus];

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Profile</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500">
          {profile.phone}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${v.className}`}>{v.label}</span>
        </p>

      </div>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {status && <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">{status}</p>}
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-stone-700">Name</label>
          <input id="fullName" name="fullName" required defaultValue={profile.fullName} className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">Email</label>
          <input id="email" name="email" type="email" defaultValue={profile.email ?? ""} className={inputClass} />
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-stone-700">Buying as</legend>
          <div className="flex gap-4">
            {(["personal", "business"] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm capitalize">
                <input type="radio" name="buyerType" value={v} defaultChecked={profile.buyerType === v} /> {v}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="companyName" className="mb-1 block text-sm font-medium text-stone-700">Company / shop</label>
            <input id="companyName" name="companyName" defaultValue={profile.companyName ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="gstin" className="mb-1 block text-sm font-medium text-stone-700">GSTIN</label>
            <input id="gstin" name="gstin" defaultValue={profile.gstin ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="city" className="mb-1 block text-sm font-medium text-stone-700">City</label>
            <input id="city" name="city" defaultValue={profile.city ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="state" className="mb-1 block text-sm font-medium text-stone-700">State</label>
            <input id="state" name="state" defaultValue={profile.state ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="defaultAddress" className="mb-1 block text-sm font-medium text-stone-700">Default delivery address</label>
          <textarea id="defaultAddress" name="defaultAddress" rows={2} defaultValue={profile.defaultAddress ?? ""} className={inputClass} />
          <p className="mt-1 text-xs text-stone-500">Pre-filled on order forms when you are logged in.</p>
        </div>
        <button type="submit" disabled={busy} className="justify-self-start rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>

      <BuyerVerification />
    </div>
  );
}
