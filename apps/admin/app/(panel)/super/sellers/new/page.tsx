"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { createSellerSchema, type CategoryDto } from "@tradekwik/shared";
import { adminCreateSeller, getCategories, ApiFetchError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormInput = z.input<typeof createSellerSchema>;
type FormOutput = z.output<typeof createSellerSchema>;

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";
const optionalText = { setValueAs: (v: unknown) => (v === "" ? undefined : v) };
const optionalNumber = { setValueAs: (v: unknown) => (v === "" || v == null ? undefined : v) };

export default function OnboardSellerPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createSellerSchema),
    defaultValues: { servesPanIndia: false, status: "active" },
  });

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await adminCreateSeller(values);
      router.push("/super/sellers");
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof ApiFetchError ? error.message : "Could not create the seller.",
      );
    }
  });

  const err = (message?: string) =>
    message ? <p className="text-xs text-red-600">{message}</p> : null;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Onboard seller</h1>

      <form onSubmit={onSubmit} className="grid max-w-3xl gap-6">
        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="businessName">Business name *</Label>
                <Input id="businessName" {...register("businessName")} />
                {err(errors.businessName?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="categoryId">Category *</Label>
                <select id="categoryId" className={selectClass} {...register("categoryId")}>
                  <option value="">Select category…</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {err(errors.categoryId?.message)}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register("description", optionalText)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="city">City *</Label>
                <Input id="city" {...register("city")} />
                {err(errors.city?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="state">State *</Label>
                <Input id="state" {...register("state")} />
                {err(errors.state?.message)}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address", optionalText)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Business phone *</Label>
                <Input id="phone" {...register("phone")} />
                {err(errors.phone?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="whatsappNumber">WhatsApp number *</Label>
                <Input id="whatsappNumber" {...register("whatsappNumber")} />
                {err(errors.whatsappNumber?.message)}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email", optionalText)} />
                {err(errors.email?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gstNumber">GST number</Label>
                <Input id="gstNumber" {...register("gstNumber", optionalText)} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...register("servesPanIndia")} />
                Delivers pan-India
              </label>
              <div className="flex items-center gap-2">
                <Label htmlFor="deliveryRadiusKm" className="text-sm">
                  Delivery radius (km)
                </Label>
                <Input
                  id="deliveryRadiusKm"
                  type="number"
                  min={1}
                  className="w-24"
                  {...register("deliveryRadiusKm", optionalNumber)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="status" className="text-sm">
                  Status
                </Label>
                <select id="status" className={selectClass} {...register("status")}>
                  <option value="active">active</option>
                  <option value="pending">pending</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Owner login (first seller user)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="ownerName">Name *</Label>
                <Input id="ownerName" {...register("owner.name")} />
                {err(errors.owner?.name?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ownerPhone">Login phone *</Label>
                <Input id="ownerPhone" {...register("owner.phone")} />
                {err(errors.owner?.phone?.message)}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="ownerEmail">Email</Label>
                <Input id="ownerEmail" type="email" {...register("owner.email", optionalText)} />
                {err(errors.owner?.email?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ownerPassword">Password *</Label>
                <Input id="ownerPassword" type="password" {...register("owner.password")} />
                {err(errors.owner?.password?.message)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting} className="justify-self-end">
          {isSubmitting ? "Creating…" : "Create seller"}
        </Button>
      </form>
    </div>
  );
}
