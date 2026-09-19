"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AdminCategoryDto, CategoryRequestDto } from "@tradekwik/shared";
import {
  ApiFetchError,
  adminCreateCategory,
  adminDeleteCategory,
  adminListCategories,
  adminListCategoryRequests,
  adminReviewCategoryRequest,
  adminUpdateCategory,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";

function CategoryForm({
  parents,
  editing,
  onSaved,
  onCancel,
}: {
  parents: AdminCategoryDto[];
  editing?: AdminCategoryDto;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const f = new FormData(event.currentTarget);
    const input = {
      name: String(f.get("name") ?? "").trim(),
      slug: String(f.get("slug") ?? "").trim() || undefined,
      parentId: String(f.get("parentId") ?? "") || null,
      sortOrder: Number(f.get("sortOrder") ?? 0) || 0,
      isActive: f.get("isActive") === "on",
    };
    setBusy(true);
    try {
      if (editing) await adminUpdateCategory(editing.id, input);
      else await adminCreateCategory(input);
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
          <Label htmlFor="cat-name">Name *</Label>
          <Input id="cat-name" name="name" required defaultValue={editing?.name ?? ""} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cat-slug">Slug (URL)</Label>
          <Input id="cat-slug" name="slug" placeholder="auto from name" defaultValue={editing?.slug ?? ""} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cat-parent">Parent (optional)</Label>
          <select id="cat-parent" name="parentId" className={selectClass} defaultValue={editing?.parentId ?? ""}>
            <option value="">— top level —</option>
            {parents
              .filter((p) => p.id !== editing?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cat-order">Sort order</Label>
          <Input id="cat-order" name="sortOrder" type="number" min={0} defaultValue={editing?.sortOrder ?? 0} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" className="h-4 w-4" defaultChecked={editing?.isActive ?? true} />
        Visible to sellers and buyers
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : editing ? "Save" : "Add category"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function RequestRow({
  req,
  parents,
  onDone,
}: {
  req: CategoryRequestDto;
  parents: AdminCategoryDto[];
  onDone: () => void;
}) {
  const [name, setName] = useState(req.name);
  const [parentId, setParentId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      await adminReviewCategoryRequest(req.id, {
        decision,
        name: decision === "approve" ? name.trim() : undefined,
        parentId: decision === "approve" ? parentId || null : undefined,
        adminNote: note.trim() || undefined,
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-md border p-3">
      <p className="text-sm">
        <strong>{req.name}</strong> — suggested by {req.sellerName ?? "a seller"} on {formatDate(req.createdAt)}
      </p>
      {req.note && <p className="text-xs text-muted-foreground">“{req.note}”</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end">
        <div className="grid gap-1">
          <Label>Final name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label>Parent</Label>
          <select className={selectClass} value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— top level —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>Note to seller</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button size="sm" disabled={busy || name.trim().length < 2} onClick={() => decide("approve")}>Approve & create</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("reject")}>Reject</Button>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [cats, setCats] = useState<AdminCategoryDto[]>([]);
  const [requests, setRequests] = useState<CategoryRequestDto[]>([]);
  const [editing, setEditing] = useState<AdminCategoryDto | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    adminListCategories().then(setCats).catch((e: Error) => setError(e.message));
    adminListCategoryRequests("pending").then(setRequests).catch(() => setRequests([]));
  }, []);
  useEffect(reload, [reload]);

  const parents = cats.filter((c) => !c.parentId);
  const ordered = [
    ...parents.flatMap((p) => [p, ...cats.filter((c) => c.parentId === p.id)]),
    ...cats.filter((c) => c.parentId && !parents.some((p) => p.id === c.parentId)),
  ];

  async function toggle(cat: AdminCategoryDto) {
    try {
      await adminUpdateCategory(cat.id, { isActive: !cat.isActive });
      reload();
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not update.");
    }
  }

  async function remove(cat: AdminCategoryDto) {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await adminDeleteCategory(cat.id);
      reload();
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not delete.");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Two levels: top-level categories and optional sub-categories. Categories in use can be hidden but not deleted.
          </p>
        </div>
        {editing === null && <Button onClick={() => setEditing("new")}>+ Add category</Button>}
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {editing === "new" && (
        <CategoryForm parents={parents} onSaved={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
      )}

      {requests.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Suggestions from sellers ({requests.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {requests.map((req) => (
              <RequestRow key={req.id} req={req} parents={parents} onDone={reload} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">In use</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((cat) =>
              editing !== "new" && editing?.id === cat.id ? (
                <tr key={cat.id} className="border-t">
                  <td colSpan={6} className="p-3">
                    <CategoryForm parents={parents} editing={cat} onSaved={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
                  </td>
                </tr>
              ) : (
                <tr key={cat.id} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    {cat.parentId && <span className="mr-1 text-muted-foreground">↳</span>}
                    {cat.name}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">/{cat.slug}</td>
                  <td className="px-3 py-2">{cat.sortOrder}</td>
                  <td className="px-3 py-2 text-muted-foreground">{cat.productCount} products · {cat.sellerCount} sellers</td>
                  <td className="px-3 py-2">
                    {cat.isActive ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">visible</Badge> : <Badge variant="secondary">hidden</Badge>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(cat)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggle(cat)}>{cat.isActive ? "Hide" : "Show"}</Button>
                      {cat.productCount + cat.sellerCount === 0 && (
                        <Button size="sm" variant="ghost" onClick={() => remove(cat)}>Delete</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
