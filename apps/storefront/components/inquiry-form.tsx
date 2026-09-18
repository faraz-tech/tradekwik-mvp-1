"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { createInquirySchema, type InquirySource } from "@tradekwik/shared";
import { submitInquiry } from "@/lib/client-api";
import { useBuyerAuth } from "@/components/buyer-auth";

interface InquiryFormProps {
  sellerId: string;
  productId?: string;
  source: InquirySource;
  /** wa.me link passed to the success page so the buyer can continue there. */
  whatsappHref?: string;
  showQuantity?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

export function InquiryForm({
  sellerId,
  productId,
  source,
  whatsappHref,
  showQuantity = true,
}: InquiryFormProps) {
  const router = useRouter();
  const { user } = useBuyerAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const raw = {
      sellerId,
      productId,
      source,
      buyerName: String(form.get("buyerName") ?? ""),
      buyerPhone: String(form.get("buyerPhone") ?? ""),
      buyerCity: String(form.get("buyerCity") ?? "") || undefined,
      buyerType: String(form.get("buyerType") ?? "personal"),
      quantity: String(form.get("quantity") ?? "") || undefined,
      message: String(form.get("message") ?? ""),
    };

    const parsed = createInquirySchema.safeParse(raw);
    if (!parsed.success) {
      const { fieldErrors: errors } = z.flattenError(parsed.error);
      setFieldErrors(errors as Record<string, string[]>);
      return;
    }

    setSubmitting(true);
    const result = await submitInquiry(parsed.data);
    setSubmitting(false);

    if (result.ok) {
      const params = new URLSearchParams({ type: "inquiry" });
      if (whatsappHref) params.set("wa", whatsappHref);
      router.push(`/inquiry/success?${params.toString()}`);
      return;
    }
    setFormError(result.message);
    if (result.fieldErrors) setFieldErrors(result.fieldErrors);
  }

  return (
    <form key={user?.id ?? "anon"} onSubmit={onSubmit} className="grid gap-4">
      {formError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>
      )}
      {user && (
        <p className="rounded-lg bg-blue-50 px-4 py-2 text-xs text-blue-800">
          Sending as {user.name}. Replies and any order will show in your account.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="buyerName" className="mb-1 block text-sm font-medium text-stone-700">
            Your name *
          </label>
          <input id="buyerName" name="buyerName" required defaultValue={user?.name ?? ""} className={inputClass} />
          <FieldError errors={fieldErrors.buyerName} />
        </div>
        <div>
          <label htmlFor="buyerPhone" className="mb-1 block text-sm font-medium text-stone-700">
            Mobile number *
          </label>
          <input
            id="buyerPhone"
            name="buyerPhone"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile"
            required
            defaultValue={user?.phone ?? ""}
            className={inputClass}
          />
          <FieldError errors={fieldErrors.buyerPhone} />
        </div>
        <div>
          <label htmlFor="buyerCity" className="mb-1 block text-sm font-medium text-stone-700">
            City
          </label>
          <input id="buyerCity" name="buyerCity" defaultValue={user?.city ?? ""} className={inputClass} />
          <FieldError errors={fieldErrors.buyerCity} />
        </div>
        {showQuantity && (
          <div>
            <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-stone-700">
              Quantity
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              placeholder="e.g. 1"
              className={inputClass}
            />
            <FieldError errors={fieldErrors.quantity} />
          </div>
        )}
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-stone-700">Buying as</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="buyerType" value="personal" defaultChecked={user?.buyerType !== "business"} /> Personal
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="buyerType" value="business" defaultChecked={user?.buyerType === "business"} /> Business
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-stone-700">
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          required
          placeholder="Tell the seller what you need…"
          className={inputClass}
        />
        <FieldError errors={fieldErrors.message} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send inquiry"}
      </button>
      <p className="text-xs text-stone-500">
        The seller will contact you on your mobile number. No account needed
        {user ? "." : " — but with a free account you can track replies and deliveries."}
      </p>
    </form>
  );
}
