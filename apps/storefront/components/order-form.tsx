"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { createOrderRequestSchema, type OrderType } from "@tradekwik/shared";
import { submitOrderRequest } from "@/lib/client-api";

interface OrderFormProps {
  sellerId: string;
  productId: string;
  productName: string;
  whatsappHref?: string;
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

export function OrderForm({ sellerId, productId, productName, whatsappHref }: OrderFormProps) {
  const router = useRouter();
  const [orderType, setOrderType] = useState<OrderType>("retail");
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

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {formError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>
      )}

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-stone-700">Order type</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["retail", "Regular order"],
              ["bulk", "Bulk order"],
              ["booking", "Advance booking"],
            ] as const
          ).map(([value, label]) => (
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
            min={1}
            defaultValue={1}
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
          <input id="buyerName" name="buyerName" required className={inputClass} />
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
