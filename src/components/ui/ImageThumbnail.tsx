"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface ImageThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Renders a remote thumbnail with a two-stage fallback: try the direct URL
 * first, and if the browser can't load it (hotlink protection, CORS,
 * referrer restrictions), retry once through our same-origin image proxy
 * before giving up and showing the placeholder icon.
 */
export function ImageThumbnail({ src, alt, className, iconClassName }: ImageThumbnailProps) {
  const [stage, setStage] = useState<"direct" | "proxy" | "failed">("direct");

  // Reset the fallback stage whenever the underlying src changes, adjusted
  // during render (React's recommended pattern) rather than in an effect.
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setStage("direct");
  }

  const proxySrc = src ? `/api/image-proxy?url=${encodeURIComponent(src)}` : null;
  const showImage = Boolean(src) && stage !== "failed";
  const activeSrc = stage === "proxy" ? proxySrc : src;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-gradient-to-br from-surface-muted to-[#eeece6]",
        className
      )}
    >
      {showImage && activeSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={activeSrc}
          src={activeSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setStage((prev) => (prev === "direct" ? "proxy" : "failed"))}
        />
      ) : (
        <ImageOff className={cn("h-6 w-6 text-muted-foreground/40", iconClassName)} strokeWidth={1.5} />
      )}
    </div>
  );
}
