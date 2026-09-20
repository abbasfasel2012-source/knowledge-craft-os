import { useState } from "react";
import { useMediaUrl } from "@/lib/media";
import { ImageOff } from "lucide-react";

interface MediaImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

/** <img> that resolves private/signed storage URLs. Shows a placeholder on error. */
export function MediaImage({ src, alt, className, fallbackClassName }: MediaImageProps) {
  const url = useMediaUrl(src);
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${fallbackClassName ?? className ?? ""}`}
        aria-label={alt}
      >
        <ImageOff className="h-6 w-6 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}
