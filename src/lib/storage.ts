import { supabase } from "@/integrations/supabase/client";

const BUCKET = "course-media";
const STORAGE_PREFIX = "course-media://";

function safeName(name: string) {
  return name.replace(/[^\w.-]+/g, "_");
}

/**
 * رفع ملف إلى bucket التخزين مع تتبع التقدم.
 * يعيد مرجع التخزين بصيغة "course-media://path/to/file"
 */
export async function uploadMedia(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  // التحقق من تسجيل الدخول
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً لرفع الملفات");

  const path = `${folder}/${Date.now()}-${safeName(file.name)}`;

  // الحصول على URL السوبابيس من المتغيرات أو من الـ client
  const supabaseUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    "https://qjvcmjqjgnylgboqlufh.supabase.co";

  if (onProgress) {
    // رفع عبر XHR لتتبع التقدم
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("cache-control", "max-age=3600");
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90));
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          resolve();
        } else {
          let msg = "فشل رفع الملف";
          try {
            msg = JSON.parse(xhr.responseText)?.message ?? msg;
          } catch {
            /* noop */
          }
          // معالجة أخطاء الصلاحيات بوضوح
          if (xhr.status === 403 || msg.includes("row-level") || msg.includes("policy")) {
            reject(new Error("ليس لديك صلاحية رفع الملفات. تأكد من أن حسابك مسجّل كمشرف أو مدرّب."));
          } else {
            reject(new Error(msg));
          }
        }
      };

      xhr.onerror = () => reject(new Error("خطأ في الشبكة أثناء الرفع"));
      xhr.send(file);
    });
  } else {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      if (
        error.message.includes("row-level") ||
        error.message.includes("policy") ||
        (error as { statusCode?: string }).statusCode === "403"
      ) {
        throw new Error("ليس لديك صلاحية رفع الملفات. تأكد من أن حسابك مسجّل كمشرف أو مدرّب.");
      }
      throw new Error(error.message);
    }
  }

  if (onProgress) onProgress(100);
  return `${STORAGE_PREFIX}${path}`;
}

/**
 * الحصول على URL عام للملف (للـ bucket العام)
 */
export function getPublicUrl(storagePath: string): string {
  const path = storagePath.startsWith(STORAGE_PREFIX)
    ? storagePath.slice(STORAGE_PREFIX.length)
    : storagePath;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * حذف ملف من التخزين
 */
export async function deleteMedia(storagePath: string): Promise<void> {
  const path = storagePath.startsWith(STORAGE_PREFIX)
    ? storagePath.slice(STORAGE_PREFIX.length)
    : storagePath;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
