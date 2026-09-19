"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminLoginSchema, type AdminLoginInput } from "@tradekwik/shared";
import { adminAccessCheck, adminLogin, ApiFetchError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Hidden platform-admin login. Not linked from anywhere.
 * The API only answers for IPs listed in `admin_allowed_ips`; everyone else sees a plain "Not found".
 * Login additionally needs an access code from `admin_access_codes`.
 */
export default function AdminAccessPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) });

  useEffect(() => {
    adminAccessCheck()
      .then(() => setAllowed(true))
      .catch(() => setAllowed(false));
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await adminLogin(values);
      router.replace("/super/overview");
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiFetchError ? error.message : "Login failed.");
    }
  });

  if (allowed === null) return null;

  if (!allowed) {
    // Indistinguishable from a missing route.
    return (
      <main className="flex min-h-screen items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold">404</h1>
          <p className="mt-1 text-sm text-muted-foreground">This page could not be found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            Trade<span className="text-blue-700">Kwik</span> · Platform admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            {serverError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" autoComplete="username" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-code">Access code</Label>
              <Input id="admin-code" type="password" autoComplete="off" {...register("accessCode")} />
              {errors.accessCode && <p className="text-xs text-red-600">{errors.accessCode.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Checking…" : "Log in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
