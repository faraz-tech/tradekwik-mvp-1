"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductMediaItem } from "@tradekwik/shared";

export function MediaGallery({ media, name }: { media: ProductMediaItem[]; name: string }) {
  const [active, setActive] = useState(0);

  if (media.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-stone-100 text-stone-400">
        No media
      </div>
    );
  }

  const current = media[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        {current.type === "image" ? (
          <Image
            src={current.url}
            alt={current.alt ?? name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain"
          />
        ) : (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            className="h-full w-full object-contain"
          >
            Your browser does not support video playback.
          </video>
        )}
      </div>
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((item, i) => (
            <button
              key={item.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show media ${i + 1}`}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-stone-100 ${
                i === active ? "border-blue-600" : "border-transparent"
              }`}
            >
              {item.type === "image" ? (
                <Image src={item.url} alt="" fill sizes="80px" className="object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-xl">▶</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
