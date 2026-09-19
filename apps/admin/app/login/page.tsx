"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sellerLoginSchema, type SellerLoginInput } from "@tradekwik/shared";
import { login, ApiFetchError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Seller login only. Platform admins use the unlisted /admin-access page. */
export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SellerLoginInput>({ resolver: zodResolver(sellerLoginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof ApiFetchError ? error.message : "Login failed. Please try again.",
      );
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            Trade<span className="text-blue-700">Kwik</span> Seller
          </CardTitle>
          <CardDescription>Log in with your registered mobile number.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            {serverError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" type="tel" placeholder="98765 00001" {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New to TradeKwik?{" "}
            <Link href="/register" className="font-medium text-blue-700 hover:underline">
              Register your business
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
