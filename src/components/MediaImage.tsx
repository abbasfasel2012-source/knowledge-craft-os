import { useMediaUrl } from "@/lib/media";

interface MediaImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

/** <img> that resolves private storage URLs to fresh signed URLs. */
export function MediaImage({ src, alt, className }: MediaImageProps) {
  const url = useMediaUrl(src);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
