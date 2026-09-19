"use client";

import { useState, type FormEvent } from "react";
import { ApiFetchError, createCategoryRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** "Can't find your category?" — sends a suggestion to the platform admin. */
export function CategorySuggest() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const f = new FormData(event.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const note = String(f.get("note") ?? "").trim() || undefined;
    setBusy(true);
    try {
      await createCategoryRequest({ name, note });
      setDone(name);
      setOpen(false);
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not send the suggestion.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="text-xs text-green-700">
        Thanks — we received your suggestion “{done}”. We will add it and let you know; meanwhile pick the closest category.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-left text-xs text-blue-700 hover:underline">
        Can&apos;t find your category? Suggest one
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 rounded-md border bg-muted/40 p-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Input name="name" required minLength={2} maxLength={80} placeholder="Category name, e.g. Packaging machines" />
      <Input name="note" maxLength={500} placeholder="What do you sell in it? (optional)" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Sending…" : "Send suggestion"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
