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

export function ImageThumbnail({ src, alt, className, iconClassName }: ImageThumbnailProps) {
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(src) && !errored;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-gradient-to-br from-surface-muted to-[#eeece6]",
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <ImageOff className={cn("h-6 w-6 text-muted-foreground/40", iconClassName)} strokeWidth={1.5} />
      )}
    </div>
  );
}
