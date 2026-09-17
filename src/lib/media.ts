import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "course-media";
const STORAGE_PREFIX = `${BUCKET}://`;
const cache = new Map<string, { url: string; expiresAt: number }>();

/** استخراج مسار التخزين من أي URL. */
export function storagePath(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith(STORAGE_PREFIX)) return url.slice(STORAGE_PREFIX.length);
  const m = url.match(
    /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/,
  );
  if (!m || m[1] !== BUCKET) return null;
  return decodeURIComponent(m[2]);
}

/**
 * يعيد URL صالحاً للملف.
 * للـ bucket العام: يستخدم URL عام مباشر (لا يحتاج signing).
 * للمسارات الخارجية: يعيدها كما هي.
 */
export async function resolveMedia(
  url?: string | null,
  _forceRefresh = false,
): Promise<string | undefined> {
  if (!url) return undefined;
  const path = storagePath(url);
  if (!path) return url; // مسار خارجي

  // فحص الكاش
  const cached = cache.get(path);
  if (!_forceRefresh && cached && cached.expiresAt > Date.now()) return cached.url;

  // للـ bucket العام استخدم URL عام (أسرع ولا يحتاج session)
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (publicData?.publicUrl) {
    // تخزين مؤقت لمدة ساعة
    cache.set(path, { url: publicData.publicUrl, expiresAt: Date.now() + 60 * 60 * 1000 });
    return publicData.publicUrl;
  }

  // احتياطي: URL موقّع
  const { data: signedData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 6);
  if (!signedData?.signedUrl) return undefined;
  cache.set(path, { url: signedData.signedUrl, expiresAt: Date.now() + 5.5 * 60 * 60 * 1000 });
  return signedData.signedUrl;
}

/** React hook يعيد URL قابلاً للاستخدام. */
export function useMediaUrl(url?: string | null): string | undefined {
  const path = storagePath(url);
  const [resolved, setResolved] = useState<string | undefined>(() => {
    if (!url) return undefined;
    if (!path) return url;
    return cache.get(path)?.url ?? (url.startsWith("http") ? url : undefined);
  });

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
    if (url.startsWith("http")) setResolved(url);
    void resolveMedia(url).then((u) => {
      if (active) setResolved(u);
    });
    return () => {
      active = false;
    };
  }, [url, path]);

  return resolved;
}

export function useMediaSrc(url?: string | null) {
  return useMediaUrl(url);
}
