import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "course-media";
const STORAGE_PREFIX = `${BUCKET}://`;
const cache = new Map<string, { url: string; expiresAt: number }>();

/** Extracts the storage object path from any Supabase storage URL (public or signed). */
export function storagePath(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith(STORAGE_PREFIX)) return url.slice(STORAGE_PREFIX.length);
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!m || m[1] !== BUCKET) return null;
  return decodeURIComponent(m[2]);
}

/** Returns a fresh signed URL for a stored media URL (or the URL itself if external). */
export async function resolveMedia(
  url?: string | null,
  forceRefresh = false,
): Promise<string | undefined> {
  if (!url) return undefined;
  const path = storagePath(url);
  if (!path) return url;
  const cached = cache.get(path);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.url;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 6);
  if (!data?.signedUrl) return undefined;
  cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 5.5 * 60 * 60 * 1000 });
  return data.signedUrl;
}

/** React hook returning a usable (freshly signed) URL for a stored media URL. */
export function useMediaUrl(url?: string | null): string | undefined {
  const path = storagePath(url);
  const [resolved, setResolved] = useState<string | undefined>(
    path ? cache.get(path)?.url : (url ?? undefined),
  );

  useEffect(() => {
    let active = true;
    if (!url) {
      setResolved(undefined);
      return;
    }
    if (!path) {
      setResolved(url);
      return;
    }
    const cached = cache.get(path);
    if (cached && cached.expiresAt > Date.now()) {
      setResolved(cached.url);
      return;
    }
    void resolveMedia(url).then((u) => {
      if (active) setResolved(u);
    });
    return () => {
      active = false;
    };
  }, [url, path]);

  return resolved;
}

/** Image that automatically signs private storage URLs. */
export function useMediaSrc(url?: string | null) {
  return useMediaUrl(url);
}
