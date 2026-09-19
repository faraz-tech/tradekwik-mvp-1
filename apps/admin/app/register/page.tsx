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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhoneVerify } from "@/components/phone-verify";

type FormInput = z.input<typeof sellerRegisterSchema>;
type FormOutput = z.output<typeof sellerRegisterSchema>;

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";
const optionalText = { setValueAs: (v: unknown) => (v === "" ? undefined : v) };

export default function RegisterSellerPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ businessName: string; slug: string } | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(sellerRegisterSchema),
    defaultValues: { sellerKind: "retailer", servesPanIndia: false, otpToken: "" },
  });
  const loginPhone = watch("loginPhone") ?? "";
  const otpToken = watch("otpToken") ?? "";

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
            <CardDescription>Your details are saved. We will notify you when TradeKwik is ready.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <p>
              TradeKwik is still being built. When the platform is ready, you will get a message on
              your registered mobile number: your account will be approved and your free trial will
              start from that day.
            </p>
            <ol className="grid list-decimal gap-1 pl-5 text-muted-foreground">
              <li>Wait for our message — nothing to do until then.</li>
              <li>Then log in with your mobile number and password.</li>
              <li>Fill in your store, add products and upload documents for the Verified badge.</li>
            </ol>
            <p>
              Questions or want to be listed early? Email{" "}
              <a href="mailto:tradekwik.team@gmail.com" className="font-medium text-blue-700 underline">
                tradekwik.team@gmail.com
              </a>
              .
            </p>
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
      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span aria-hidden>⚠️</span> Please read before you register
            </DialogTitle>
            <DialogDescription asChild>
              <div className="grid gap-3 pt-2 text-sm text-foreground">
                <p>
                  We are still building TradeKwik. Fill in your details now and we will keep them safe.
                  When the platform is ready you will be notified on your mobile number, your account
                  will be approved and your free trial will start from that day.
                </p>
                <p>
                  Want to get your listing in early, or have a question? Email{" "}
                  <a href="mailto:tradekwik.team@gmail.com" className="font-semibold text-blue-700 underline">
                    tradekwik.team@gmail.com
                  </a>
                  .
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setNoticeOpen(false)}>
              I understand, continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">
            Sell on Trade<span className="text-blue-700">Kwik</span>
          </CardTitle>
          <CardDescription>
            Buyers contact you directly on WhatsApp or phone — no middlemen.
          </CardDescription>
          <div className="mt-3 grid gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
            <p>
              <strong>We are still building TradeKwik.</strong> Fill in your details now and we will keep
              them safe. When the platform is ready you will be notified on your mobile number, your
              account will be approved and your free trial will start from that day.
            </p>
            <p>
              Want to get your listing in early, or have a question? Email{" "}
              <a href="mailto:tradekwik.team@gmail.com" className="font-semibold underline">
                tradekwik.team@gmail.com
              </a>
              .
            </p>
          </div>
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
                <PhoneVerify
                  phone={loginPhone}
                  purpose="seller_register"
                  onVerified={(token) => setValue("otpToken", token ?? "", { shouldValidate: Boolean(token) })}
                />
                <input type="hidden" {...register("otpToken")} />
                {err(errors.otpToken?.message)}
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" {...register("password")} />
                {err(errors.password?.message)}
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting || !otpToken}>
              {isSubmitting ? "Creating…" : otpToken ? "Create seller account" : "Verify your mobile number to continue"}
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
