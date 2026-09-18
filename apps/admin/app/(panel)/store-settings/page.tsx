"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  SELLER_KINDS,
  SELLER_KIND_LABELS,
  TEAM_SIZE_RANGES,
  updateSellerProfileSchema,
  type SellerProfileDto,
} from "@tradekwik/shared";
import { getProfile, updateProfile, uploadImage, ApiFetchError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormInput = z.input<typeof updateSellerProfileSchema>;
type FormOutput = z.output<typeof updateSellerProfileSchema>;

const optionalNumber = { setValueAs: (v: unknown) => (v === "" || v == null ? null : v) };
const optionalText = { setValueAs: (v: unknown) => (v === "" ? null : v) };
const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";

export default function StoreSettingsPage() {
  const [profile, setProfile] = useState<SellerProfileDto | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(updateSellerProfileSchema),
  });

  useEffect(() => {
    getProfile().then((data) => {
      setProfile(data);
      reset({
        businessName: data.businessName,
        description: data.description,
        city: data.city,
        state: data.state,
        address: data.address,
        phone: data.phone,
        whatsappNumber: data.whatsappNumber,
        email: data.email,
        gstNumber: data.gstNumber,
        servesPanIndia: data.servesPanIndia,
        deliveryRadiusKm: data.deliveryRadiusKm,
        logoUrl: data.logoUrl,
        coverImageUrl: data.coverImageUrl,
        sellerKind: data.sellerKind,
        foundedYear: data.foundedYear,
        teamSizeRange: data.teamSizeRange,
      });
    });
  }, [reset]);

  const logoUrl = watch("logoUrl");
  const coverUrl = watch("coverImageUrl");

  async function onUpload(kind: "logo" | "cover", file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    try {
      const { url } = await uploadImage(file);
      setValue(kind === "logo" ? "logoUrl" : "coverImageUrl", url, { shouldDirty: true });
    } catch (error) {
      setStatus(error instanceof ApiFetchError ? error.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setStatus(null);
    try {
      const updated = await updateProfile(values);
      setProfile(updated);
      setStatus("Saved! Changes appear on your storefront within a few minutes.");
    } catch (error) {
      setStatus(error instanceof ApiFetchError ? error.message : "Could not save.");
    }
  });

  if (!profile) return <p className="text-sm text-muted-foreground">Loading settings…</p>;

  const err = (name: keyof FormInput) =>
    errors[name] ? <p className="text-xs text-red-600">{String(errors[name]?.message)}</p> : null;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Store settings</h1>
        <p className="text-sm text-muted-foreground">
          Your public storefront: /store/{profile.slug}
          {profile.isVerified && " · ✓ Verified"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid max-w-3xl gap-6">
        {status && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{status}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" {...register("businessName")} />
              {err("businessName")}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="sellerKind">Business type</Label>
                <select id="sellerKind" className={selectClass} {...register("sellerKind")}>
                  {SELLER_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {SELLER_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Shown as a badge; buyers can filter by it.</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="foundedYear">Founded (year)</Label>
                <Input id="foundedYear" type="number" min={1900} max={2100} {...register("foundedYear", optionalNumber)} />
                {err("foundedYear")}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="teamSizeRange">Team size</Label>
                <select id="teamSizeRange" className={selectClass} {...register("teamSizeRange", optionalText)}>
                  <option value="">Not specified</option>
                  {TEAM_SIZE_RANGES.map((range) => (
                    <option key={range} value={range}>
                      {range} people
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">About your business</Label>
              <Textarea id="description" rows={4} {...register("description", optionalText)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register("city")} />
                {err("city")}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register("state")} />
                {err("state")}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address", optionalText)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gstNumber">GST number</Label>
              <Input id="gstNumber" {...register("gstNumber", optionalText)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact & delivery</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
                {err("phone")}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="whatsappNumber">WhatsApp number</Label>
                <Input id="whatsappNumber" {...register("whatsappNumber")} />
                {err("whatsappNumber")}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email (for inquiry notifications)</Label>
              <Input id="email" type="email" {...register("email", optionalText)} />
              {err("email")}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" {...register("servesPanIndia")} />
              We deliver all over India
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor="deliveryRadiusKm">Delivery radius (km, if not pan-India)</Label>
              <Input
                id="deliveryRadiusKm"
                type="number"
                min={1}
                {...register("deliveryRadiusKm", optionalNumber)}
              />
              {err("deliveryRadiusKm")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Images</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Logo</Label>
              {logoUrl && (
                <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-muted">
                  <Image src={logoUrl} alt="Logo" fill sizes="80px" className="object-cover" unoptimized />
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                disabled={uploading !== null}
                onChange={(e) => onUpload("logo", e.target.files?.[0])}
              />
              {uploading === "logo" && (
                <p className="text-xs text-muted-foreground">Uploading…</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Cover image</Label>
              {coverUrl && (
                <div className="relative h-20 w-40 overflow-hidden rounded-md border bg-muted">
                  <Image src={coverUrl} alt="Cover" fill sizes="160px" className="object-cover" unoptimized />
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                disabled={uploading !== null}
                onChange={(e) => onUpload("cover", e.target.files?.[0])}
              />
              {uploading === "cover" && (
                <p className="text-xs text-muted-foreground">Uploading…</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting || uploading !== null} className="justify-self-end">
          {isSubmitting ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </div>
  );
}
