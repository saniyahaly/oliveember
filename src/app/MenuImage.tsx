"use client";

import { useState } from "react";
import { validateMenuImageUrl } from "@/lib/menu-image";

export default function MenuImage({
  url,
  preview = false,
}: {
  url?: string | null;
  preview?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const { url: src } = validateMenuImageUrl(url);

  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden bg-[#24382C] ${preview ? "rounded-md" : ""}`}
    >
      {src && failedUrl !== src ? (
        // Render directly in the browser so the app never fetches admin-supplied URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={preview ? "Dish image preview" : ""}
          className="h-full w-full object-cover"
          loading={preview ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(src)}
        />
      ) : (
        <div className="absolute inset-0 grid place-content-center justify-items-center gap-3 bg-linear-to-br from-[#365240] to-[#17271D] text-[#D4B486]">
          <span
            aria-hidden="true"
            className="grid size-16 place-items-center rounded-full border border-[#D4B486]/50 font-serif text-2xl"
          >
            ✦
          </span>
          {preview && <p role="status" className="text-xs">Image could not be loaded.</p>}
        </div>
      )}
    </div>
  );
}
