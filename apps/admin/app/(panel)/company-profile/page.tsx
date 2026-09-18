"use client";

import { useEffect, useState } from "react";
import {
  REGISTRATION_TYPES,
  REGISTRATION_TYPE_LABELS,
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_LABELS,
  sellerCompanyProfileInputSchema,
  type ProcessStep,
  type SellerCompanyProfileOwnDto,
  type SellerVideo,
  type SocialLink,
} from "@tradekwik/shared";
import { z } from "zod";
import { ApiFetchError, getCompanyProfile, updateCompanyProfile, uploadImage } from "@/lib/api";
import { useCan } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";

export default function CompanyProfilePage() {
  const canWrite = useCan("profile:write");
  const [data, setData] = useState<SellerCompanyProfileOwnDto | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getCompanyProfile().then(setData).catch(() => setStatus("Could not load the company profile."));
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const set = <K extends keyof SellerCompanyProfileOwnDto>(key: K, value: SellerCompanyProfileOwnDto[K]) =>
    setData((d) => (d ? { ...d, [key]: value } : d));

  const text = (key: keyof SellerCompanyProfileOwnDto) => ({
    value: (data[key] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, (e.target.value || null) as never),
  });

  async function onSave() {
    if (!data) return;
    setStatus(null);
    const parsed = sellerCompanyProfileInputSchema.safeParse({
      ...data,
      registrationYear: data.registrationYear ?? null,
    });
    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error);
      const first = Object.entries(fieldErrors)[0];
      setStatus(first ? `${first[0]}: ${(first[1] as string[])[0]}` : "Please check the form.");
      return;
    }
    setSaving(true);
    try {
      setData(await updateCompanyProfile(parsed.data));
      setStatus("Saved. Buyers see this on your store's About page.");
    } catch (e) {
      setStatus(e instanceof ApiFetchError ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function addPhoto(file: File | undefined) {
    if (!file || !data) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      set("premisesPhotos", [...data.premisesPhotos, { url, alt: file.name }]);
    } catch (e) {
      setStatus(e instanceof ApiFetchError ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const updateStep = (i: number, patch: Partial<ProcessStep>) =>
    set("processSteps", data.processSteps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const updateLink = (i: number, patch: Partial<SocialLink>) =>
    set("socialLinks", data.socialLinks.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const updateVideo = (i: number, patch: Partial<SellerVideo>) =>
    set("videos", data.videos.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Company profile</h1>
        <p className="text-sm text-muted-foreground">
          Everything here is public on your store&apos;s About page. The more you fill in, the more
          buyers trust you before they call.
        </p>
      </div>

      {status && <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{status}</p>}

      <fieldset disabled={!canWrite} className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Registration</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Legal name</Label>
              <Input {...text("legalName")} placeholder="As on GST certificate" />
            </div>
            <div className="grid gap-1.5">
              <Label>Registration type</Label>
              <select
                className={selectClass}
                value={data.registrationType ?? ""}
                onChange={(e) => set("registrationType", (e.target.value || null) as never)}
              >
                <option value="">Select…</option>
                {REGISTRATION_TYPES.map((t) => (
                  <option key={t} value={t}>{REGISTRATION_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Year registered</Label>
              <Input
                type="number"
                min={1900}
                max={2100}
                value={data.registrationYear ?? ""}
                onChange={(e) => set("registrationYear", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Udyam / MSME number</Label>
              <Input {...text("udyamNumber")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">How you work</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Production / supply capacity</Label>
              <Textarea rows={2} {...text("capacityNote")} placeholder="e.g. 40 machines per month" />
            </div>
            <div className="grid gap-1.5">
              <Label>Lead times</Label>
              <Textarea rows={2} {...text("leadTimeNote")} placeholder="e.g. ready stock ships in 2-3 days" />
            </div>
            <div className="grid gap-1.5">
              <Label>Payment terms</Label>
              <Textarea rows={2} {...text("paymentTerms")} placeholder="e.g. 50% advance, balance before dispatch" />
            </div>
            <div className="grid gap-1.5">
              <Label>Warranty / returns</Label>
              <Textarea rows={2} {...text("returnPolicy")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Process steps</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-xs text-muted-foreground">Shown as a numbered flow, e.g. raw material → production → QC → packing → dispatch.</p>
            {data.processSteps.map((step, i) => (
              <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_2fr_auto]">
                <Input placeholder="Step title" value={step.title} onChange={(e) => updateStep(i, { title: e.target.value })} />
                <Input placeholder="Short description" value={step.description ?? ""} onChange={(e) => updateStep(i, { description: e.target.value || undefined })} />
                <Button type="button" variant="ghost" size="sm" onClick={() => set("processSteps", data.processSteps.filter((_, idx) => idx !== i))}>✕</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set("processSteps", [...data.processSteps, { title: "" }])}>
              + Add step
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Social links & website</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {data.socialLinks.map((link, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                <select className={selectClass} value={link.platform} onChange={(e) => updateLink(i, { platform: e.target.value as never })}>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>{SOCIAL_PLATFORM_LABELS[p]}</option>
                  ))}
                </select>
                <Input placeholder="https://…" value={link.url} onChange={(e) => updateLink(i, { url: e.target.value })} />
                <Button type="button" variant="ghost" size="sm" onClick={() => set("socialLinks", data.socialLinks.filter((_, idx) => idx !== i))}>✕</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set("socialLinks", [...data.socialLinks, { platform: "website", url: "" }])}>
              + Add link
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">YouTube videos</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-xs text-muted-foreground">Factory tour, product demos, customer testimonials. Paste the full YouTube link.</p>
            {data.videos.map((video, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input placeholder="https://www.youtube.com/watch?v=…" value={video.url} onChange={(e) => updateVideo(i, { url: e.target.value })} />
                <Input placeholder="Title" value={video.title ?? ""} onChange={(e) => updateVideo(i, { title: e.target.value || undefined })} />
                <Button type="button" variant="ghost" size="sm" onClick={() => set("videos", data.videos.filter((_, idx) => idx !== i))}>✕</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set("videos", [...data.videos, { url: "" }])}>
              + Add video
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Premises photos</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap gap-3">
              {data.premisesPhotos.map((photo, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.alt ?? ""} className="h-20 w-28 rounded-md border object-cover" />
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => set("premisesPhotos", data.premisesPhotos.filter((_, idx) => idx !== i))}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => addPhoto(e.target.files?.[0])} />
          </CardContent>
        </Card>

        {canWrite && (
          <Button onClick={onSave} disabled={saving || uploading} className="justify-self-end">
            {saving ? "Saving…" : "Save company profile"}
          </Button>
        )}
      </fieldset>
    </div>
  );
}
