"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  SELLER_KINDS,
  SELLER_KIND_LABELS,
  sellerRegisterSchema,
  type CategoryDto,
} from "@tradekwik/shared";
import { ApiFetchError, getCategories, registerSeller } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormInput = z.input<typeof sellerRegisterSchema>;
type FormOutput = z.output<typeof sellerRegisterSchema>;

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";
const optionalText = { setValueAs: (v: unknown) => (v === "" ? undefined : v) };

export default function RegisterSellerPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ businessName: string; slug: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(sellerRegisterSchema),
    defaultValues: { sellerKind: "retailer", servesPanIndia: false },
  });

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const result = await registerSeller(values);
      setDone({ businessName: result.businessName, slug: result.slug });
    } catch (error) {
      setServerError(error instanceof ApiFetchError ? error.message : "Could not create your account.");
    }
  });

  const err = (message?: string) => (message ? <p className="text-xs text-red-600">{message}</p> : null);

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-xl">Thanks, {done.businessName}!</CardTitle>
            <CardDescription>Your store is registered and awaiting approval.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <p>
              Our team reviews new sellers, usually within one working day. You will get a WhatsApp
              message on your registered number once your store is live.
            </p>
            <ol className="grid list-decimal gap-1 pl-5 text-muted-foreground">
              <li>After approval, log in with your mobile number and password.</li>
              <li>Fill in your store settings and company profile.</li>
              <li>Add products, then upload documents to earn the Verified badge.</li>
            </ol>
            <p className="text-xs text-muted-foreground">Your store address will be /store/{done.slug}</p>
            <Button asChild>
              <Link href="/login">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-muted/40 p-4 py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">
            Sell on Trade<span className="text-blue-700">Kwik</span>
          </CardTitle>
          <CardDescription>
            Free to list. Buyers contact you directly on WhatsApp or phone — no commission, no
            middlemen. Approval takes about one working day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-5">
            {serverError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="businessName">Business name *</Label>
                <Input id="businessName" {...register("businessName")} />
                {err(errors.businessName?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sellerKind">I am a *</Label>
                <select id="sellerKind" className={selectClass} {...register("sellerKind")}>
                  {SELLER_KINDS.map((kind) => (
                    <option key={kind} value={kind}>{SELLER_KIND_LABELS[kind]}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="categoryId">Main category *</Label>
                <select id="categoryId" className={selectClass} {...register("categoryId")}>
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {err(errors.categoryId?.message)}
              </div>
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
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="description">What do you sell? (shown on your store)</Label>
                <Textarea id="description" rows={3} {...register("description", optionalText)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Business phone *</Label>
                <Input id="phone" type="tel" placeholder="10-digit mobile" {...register("phone")} />
                {err(errors.phone?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="whatsappNumber">WhatsApp number *</Label>
                <Input id="whatsappNumber" type="tel" placeholder="10-digit mobile" {...register("whatsappNumber")} />
                {err(errors.whatsappNumber?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email", optionalText)} />
                {err(errors.email?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gstNumber">GSTIN (if registered)</Label>
                <Input id="gstNumber" {...register("gstNumber", optionalText)} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="h-4 w-4" {...register("servesPanIndia")} />
                We deliver all over India
              </label>
            </div>

            <div className="grid gap-4 rounded-md border bg-muted/40 p-4 sm:grid-cols-2">
              <p className="text-sm font-medium sm:col-span-2">Your login</p>
              <div className="grid gap-1.5">
                <Label htmlFor="ownerName">Your name *</Label>
                <Input id="ownerName" {...register("ownerName")} />
                {err(errors.ownerName?.message)}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="loginPhone">Login mobile number *</Label>
                <Input id="loginPhone" type="tel" placeholder="10-digit mobile" {...register("loginPhone")} />
                {err(errors.loginPhone?.message)}
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" {...register("password")} />
                {err(errors.password?.message)}
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create seller account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link href="/login" className="font-medium text-blue-700 hover:underline">Log in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
