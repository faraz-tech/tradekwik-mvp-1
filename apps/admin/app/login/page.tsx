"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  adminLoginSchema,
  sellerLoginSchema,
  type AdminLoginInput,
  type SellerLoginInput,
} from "@tradekwik/shared";
import { adminLogin, login, ApiFetchError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SellerLoginForm() {
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
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await adminLogin(values);
      router.replace("/super/overview");
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof ApiFetchError ? error.message : "Login failed. Please try again.",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="admin-email">Email</Label>
        <Input id="admin-email" type="email" {...register("email")} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="admin-password">Password</Label>
        <Input id="admin-password" type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in…" : "Log in as admin"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"seller" | "admin">("seller");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            Trade<span className="text-blue-700">Kwik</span>
          </CardTitle>
          <CardDescription>
            {mode === "seller"
              ? "Log in with your registered mobile number."
              : "Platform administrator login."}
          </CardDescription>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(["seller", "admin"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  mode === value ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {mode === "seller" ? <SellerLoginForm /> : <AdminLoginForm />}
          {mode === "seller" && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              New to TradeKwik?{" "}
              <Link href="/register" className="font-medium text-blue-700 hover:underline">
                Register your business
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
