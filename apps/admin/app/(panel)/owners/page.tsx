"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  SELLER_USER_ROLES,
  SELLER_USER_ROLE_LABELS,
  SELLER_ROLE_PERMISSIONS,
  type SellerOwnerDto,
  type SellerTeamMemberDto,
  type SellerUserRole,
} from "@tradekwik/shared";
import {
  ApiFetchError,
  createOwner,
  createTeamMember,
  deleteOwner,
  deleteTeamMember,
  listOwners,
  listTeam,
  updateOwner,
  updateTeamMember,
  uploadImage,
} from "@/lib/api";
import { useAuthUser, useCan } from "@/components/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";

// ---------------- Owners (public "people behind the business") ----------------

function OwnerForm({
  owner,
  onSaved,
  onCancel,
}: {
  owner?: SellerOwnerDto;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(owner?.photoUrl ?? null);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      setPhotoUrl((await uploadImage(file)).url);
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const f = new FormData(event.currentTarget);
    const input = {
      fullName: String(f.get("fullName") ?? "").trim(),
      designation: String(f.get("designation") ?? "").trim() || null,
      photoUrl,
      bio: String(f.get("bio") ?? "").trim() || null,
      yearsExperience: String(f.get("yearsExperience") ?? "") ? Number(f.get("yearsExperience")) : null,
      languages: String(f.get("languages") ?? "")
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
      isPrimary: f.get("isPrimary") === "on",
      sortOrder: Number(f.get("sortOrder") ?? 0) || 0,
    };
    setBusy(true);
    try {
      if (owner) await updateOwner(owner.id, input);
      else await createOwner(input);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-md border bg-muted/40 p-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="fullName">Full name *</Label>
          <Input id="fullName" name="fullName" required defaultValue={owner?.fullName ?? ""} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="designation">Designation</Label>
          <Input id="designation" name="designation" defaultValue={owner?.designation ?? ""} placeholder="Owner / Partner / Director" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="yearsExperience">Years of experience</Label>
          <Input id="yearsExperience" name="yearsExperience" type="number" min={0} max={80} defaultValue={owner?.yearsExperience ?? ""} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="languages">Languages (comma separated)</Label>
          <Input id="languages" name="languages" defaultValue={owner?.languages.join(", ") ?? ""} placeholder="Gujarati, Hindi, English" />
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="bio">Short bio / story</Label>
        <Textarea id="bio" name="bio" rows={3} defaultValue={owner?.bio ?? ""} placeholder="How you started, what you personally handle…" />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="grid gap-1">
          <Label htmlFor="photo">Photo</Label>
          <Input id="photo" type="file" accept="image/*" disabled={busy} onChange={(e) => onUpload(e.target.files?.[0])} />
          {photoUrl && <span className="text-xs text-muted-foreground">Photo uploaded</span>}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="sortOrder">Order</Label>
          <Input id="sortOrder" name="sortOrder" type="number" min={0} className="w-20" defaultValue={owner?.sortOrder ?? 0} />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="isPrimary" className="h-4 w-4" defaultChecked={owner?.isPrimary ?? false} />
          Primary contact
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : owner ? "Save changes" : "Add person"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function OwnersSection() {
  const canWrite = useCan("profile:write");
  const [owners, setOwners] = useState<SellerOwnerDto[]>([]);
  const [editing, setEditing] = useState<SellerOwnerDto | "new" | null>(null);

  const reload = useCallback(() => {
    listOwners().then(setOwners).catch(() => setOwners([]));
  }, []);
  useEffect(reload, [reload]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">People behind the business</CardTitle>
        <p className="text-sm text-muted-foreground">
          Shown publicly on your About page. Buyers trust a face and a story.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        {owners.length === 0 && editing === null && (
          <p className="text-sm text-muted-foreground">No one added yet.</p>
        )}
        {owners.map((owner) =>
          editing !== "new" && editing?.id === owner.id ? (
            <OwnerForm key={owner.id} owner={owner} onSaved={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
          ) : (
            <div key={owner.id} className="flex items-start gap-3 rounded-md border p-3">
              {owner.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={owner.photoUrl} alt={owner.fullName} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-semibold">
                  {owner.fullName.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {owner.fullName}
                  {owner.isPrimary && <Badge variant="secondary">Primary</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[owner.designation, owner.yearsExperience != null ? `${owner.yearsExperience} yrs experience` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {owner.bio && <p className="mt-1 line-clamp-2 text-sm">{owner.bio}</p>}
              </div>
              {canWrite && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing(owner)}>Edit</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm(`Remove ${owner.fullName}?`)) return;
                      await deleteOwner(owner.id);
                      reload();
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ),
        )}
        {editing === "new" ? (
          <OwnerForm onSaved={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
        ) : (
          canWrite && (
            <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setEditing("new")}>
              + Add person
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}

// ---------------- Team (login users with roles) ----------------

const assignable = SELLER_USER_ROLES.filter((r) => r !== "owner" && r !== "staff");

function TeamSection() {
  const me = useAuthUser();
  const [team, setTeam] = useState<SellerTeamMemberDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const reload = useCallback(() => {
    listTeam().then(setTeam).catch(() => setTeam([]));
  }, []);
  useEffect(reload, [reload]);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const f = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await createTeamMember({
        name: String(f.get("name") ?? "").trim(),
        phone: String(f.get("phone") ?? "").trim(),
        email: String(f.get("email") ?? "").trim() || undefined,
        password: String(f.get("password") ?? ""),
        role: String(f.get("role") ?? "sales") as never,
      });
      setAdding(false);
      reload();
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not add the team member.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(member: SellerTeamMemberDto, role: SellerUserRole) {
    setError(null);
    try {
      await updateTeamMember(member.id, { role: role as never });
      reload();
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not change the role.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team logins & roles</CardTitle>
        <p className="text-sm text-muted-foreground">
          Give staff their own login with only the access they need.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => {
                const isSelf = me?.id === member.id;
                return (
                  <tr key={member.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {member.name} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                    </td>
                    <td className="px-3 py-2">{member.phone}</td>
                    <td className="px-3 py-2">
                      {member.role === "owner" || isSelf ? (
                        SELLER_USER_ROLE_LABELS[member.role]
                      ) : (
                        <select
                          className={selectClass}
                          value={member.role}
                          onChange={(e) => changeRole(member, e.target.value as SellerUserRole)}
                        >
                          {[...assignable, ...(member.role === "staff" ? ["staff" as const] : [])].map((r) => (
                            <option key={r} value={r}>{SELLER_USER_ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {member.role !== "owner" && !isSelf && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (!confirm(`Remove ${member.name}'s login?`)) return;
                            await deleteTeamMember(member.id).catch((e) =>
                              setError(e instanceof ApiFetchError ? e.message : "Could not remove."),
                            );
                            reload();
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {adding ? (
          <form onSubmit={onAdd} className="grid gap-3 rounded-md border bg-muted/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="tm-name">Name *</Label>
                <Input id="tm-name" name="name" required />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="tm-phone">Login phone *</Label>
                <Input id="tm-phone" name="phone" required placeholder="10-digit mobile" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="tm-email">Email</Label>
                <Input id="tm-email" name="email" type="email" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="tm-password">Password *</Label>
                <Input id="tm-password" name="password" type="password" required minLength={6} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="tm-role">Role *</Label>
                <select id="tm-role" name="role" className={selectClass} defaultValue="sales">
                  {assignable.map((r) => (
                    <option key={r} value={r}>{SELLER_USER_ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>{busy ? "Adding…" : "Add team member"}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setAdding(true)}>
            + Add team member
          </Button>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">What can each role do?</summary>
          <table className="mt-2 w-full text-xs">
            <tbody>
              {assignable.map((r) => (
                <tr key={r} className="border-t">
                  <td className="py-1 pr-3 font-medium">{SELLER_USER_ROLE_LABELS[r]}</td>
                  <td className="py-1 text-muted-foreground">{SELLER_ROLE_PERMISSIONS[r].join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </CardContent>
    </Card>
  );
}

export default function OwnersPage() {
  const canManageTeam = useCan("team:manage");
  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="text-2xl font-bold">Owners & team</h1>
      <OwnersSection />
      {canManageTeam && <TeamSection />}
    </div>
  );
}
