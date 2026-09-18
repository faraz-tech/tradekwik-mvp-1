"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import {
  FREIGHT_TERMS,
  FREIGHT_TERM_LABELS,
  createOrderRequestSchema,
  type OrderType,
} from "@tradekwik/shared";
import { submitOrderRequest } from "@/lib/client-api";
import { useBuyerAuth } from "@/components/buyer-auth";

interface OrderFormProps {
  sellerId: string;
  productId: string;
  productName: string;
  whatsappHref?: string;
  /** Wholesale-only listings hide the single-piece "Regular order" option. */
  wholesaleOnly?: boolean;
  minQty?: number;
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

export function OrderForm({
  sellerId,
  productId,
  productName,
  whatsappHref,
  wholesaleOnly = false,
  minQty,
}: OrderFormProps) {
  const router = useRouter();
  const { user } = useBuyerAuth();
  const [orderType, setOrderType] = useState<OrderType>(wholesaleOnly ? "bulk" : "retail");
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
      orderType,
      buyerName: String(form.get("buyerName") ?? ""),
      buyerPhone: String(form.get("buyerPhone") ?? ""),
      deliveryAddress: String(form.get("deliveryAddress") ?? ""),
      eventDate: String(form.get("eventDate") ?? "") || undefined,
      transportPreference: String(form.get("transportPreference") ?? "") || undefined,
      freightTerm: String(form.get("freightTerm") ?? "") || undefined,
      buyerNotes: String(form.get("buyerNotes") ?? "") || undefined,
      items: [
        {
          productId,
          name: productName,
          qty: String(form.get("qty") ?? "1"),
          notes: String(form.get("notes") ?? "") || undefined,
        },
      ],
    };

    const parsed = createOrderRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const { fieldErrors: errors } = z.flattenError(parsed.error);
      setFieldErrors(errors as Record<string, string[]>);
      return;
    }

    setSubmitting(true);
    const result = await submitOrderRequest(parsed.data);
    setSubmitting(false);

    if (result.ok) {
      const params = new URLSearchParams({ type: "order" });
      if (whatsappHref) params.set("wa", whatsappHref);
      router.push(`/inquiry/success?${params.toString()}`);
      return;
    }
    setFormError(result.message);
    if (result.fieldErrors) setFieldErrors(result.fieldErrors);
  }

  const orderTypes = (
    [
      ["retail", "Regular order"],
      ["bulk", "Bulk order"],
      ["booking", "Advance booking"],
    ] as const
  ).filter(([value]) => !wholesaleOnly || value !== "retail");

  return (
    <form key={user?.id ?? "anon"} onSubmit={onSubmit} className="grid gap-4">
      {formError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>
      )}
      {user && (
        <p className="rounded-lg bg-blue-50 px-4 py-2 text-xs text-blue-800">
          Ordering as {user.name}. This order will appear in your account with delivery tracking.
        </p>
      )}

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-stone-700">Order type</legend>
        <div className="flex flex-wrap gap-4">
          {orderTypes.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="orderType"
                value={value}
                checked={orderType === value}
                onChange={() => setOrderType(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {orderType === "booking" && (
        <div>
          <label htmlFor="eventDate" className="mb-1 block text-sm font-medium text-stone-700">
            Event / delivery date *
          </label>
          <input id="eventDate" name="eventDate" type="date" className={inputClass} />
          <FieldError errors={fieldErrors.eventDate} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="qty" className="mb-1 block text-sm font-medium text-stone-700">
            Quantity *
          </label>
          <input
            id="qty"
            name="qty"
            type="number"
            min={wholesaleOnly && minQty ? minQty : 1}
            defaultValue={wholesaleOnly && minQty ? minQty : 1}
            required
            className={inputClass}
          />
          <FieldError errors={fieldErrors.items} />
        </div>
        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-stone-700">
            Notes (flavours, sizes, colours…)
          </label>
          <input id="notes" name="notes" className={inputClass} />
        </div>
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
      </div>

      <div>
        <label htmlFor="deliveryAddress" className="mb-1 block text-sm font-medium text-stone-700">
          Delivery address *
        </label>
        <textarea
          id="deliveryAddress"
          name="deliveryAddress"
          rows={2}
          required
          placeholder="House/shop, street, area, city, PIN code"
          className={inputClass}
        />
        <FieldError errors={fieldErrors.deliveryAddress} />
      </div>

      <details className="rounded-lg border border-stone-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-stone-700">
          Transport preference (optional)
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="transportPreference" className="mb-1 block text-sm font-medium text-stone-700">
              Preferred transporter / branch
            </label>
            <input
              id="transportPreference"
              name="transportPreference"
              placeholder="e.g. VRL Logistics, Pune Market Yard branch"
              className={inputClass}
            />
            <FieldError errors={fieldErrors.transportPreference} />
          </div>
          <div>
            <label htmlFor="freightTerm" className="mb-1 block text-sm font-medium text-stone-700">
              Freight
            </label>
            <select id="freightTerm" name="freightTerm" defaultValue="" className={inputClass}>
              <option value="">Decide with seller</option>
              {FREIGHT_TERMS.map((term) => (
                <option key={term} value={term}>
                  {FREIGHT_TERM_LABELS[term]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="buyerNotes" className="mb-1 block text-sm font-medium text-stone-700">
              Anything else for the seller
            </label>
            <input id="buyerNotes" name="buyerNotes" className={inputClass} />
          </div>
        </div>
      </details>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {submitting ? "Placing request…" : "Place order request"}
      </button>
      <p className="text-xs text-stone-500">
        This is a request, not a payment. The seller will confirm price and delivery with
        you directly.
      </p>
    </form>
  );
}
