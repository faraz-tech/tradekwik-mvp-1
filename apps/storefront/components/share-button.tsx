"use client";

import { useEffect, useRef, useState } from "react";

interface ShareButtonProps {
  /** Absolute URL of the page being shared. */
  url: string;
  title: string;
  /** Pre-filled message for chat apps; the URL is appended. */
  text: string;
  className?: string;
}

/** Append UTM tags so we can see which share channel brings buyers. */
function tagged(url: string, medium: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "share");
  u.searchParams.set("utm_medium", medium);
  return u.toString();
}

/**
 * One-click sharing. Mobile: native share sheet. Desktop / unsupported:
 * a popover with WhatsApp, Facebook, X, LinkedIn, Telegram, Email, Copy link.
 */
export function ShareButton({ url, title, text, className = "" }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function onShare() {
    if (canNative) {
      try {
        await navigator.share({ title, text, url: tagged(url, "native") });
        return;
      } catch {
        // user cancelled or share failed — fall back to the popover
      }
    }
    setOpen((v) => !v);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(tagged(url, "copy"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const enc = encodeURIComponent;
  const targets = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${tagged(url, "whatsapp")}`)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(tagged(url, "facebook"))}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(tagged(url, "x"))}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(tagged(url, "linkedin"))}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc(tagged(url, "telegram"))}&text=${enc(text)}` },
    { label: "Email", href: `mailto:?subject=${enc(title)}&body=${enc(`${text}\n\n${tagged(url, "email")}`)}` },
  ];

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={onShare}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
      >
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Share
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-2 w-52 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg"
        >
          {targets.map((t) => (
            <a
              key={t.label}
              role="menuitem"
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              {t.label}
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={copy}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
