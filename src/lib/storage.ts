import { supabase } from "@/integrations/supabase/client";

const BUCKET = "course-media";
const STORAGE_PREFIX = "course-media://";

function safeName(name: string) {
  return name.replace(/[^\w.-]+/g, "_");
}

/**
 * Uploads a file to the private course-media bucket and returns a stable storage reference.
 * Uses XHR for upload progress tracking; falls back to supabase client if needed.
 */
export async function uploadMedia(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  // Check auth first - permissions require a logged-in user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً لرفع الملفات");

  const path = `${folder}/${Date.now()}-${safeName(file.name)}`;

  if (onProgress) {
    // XHR upload for real progress tracking
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("cache-control", "max-age=3600");
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90));
      };
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) resolve();
        else {
          let msg = "فشل رفع الملف";
          try { msg = JSON.parse(xhr.responseText)?.message ?? msg; } catch { /* noop */ }
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error("خطأ في الشبكة أثناء الرفع"));
      // Raw body upload — sending FormData corrupts the stored object (multipart wrapper).
      xhr.send(file);
    });
  } else {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      if (error.message.includes("row-level") || error.message.includes("policy") || error.statusCode === "403") {
        throw new Error("ليس لديك صلاحية رفع الملفات. تأكد من أنك مسجّل كمشرف.");
      }
      throw new Error(error.message);
    }
  }

  if (onProgress) onProgress(100);
  return `${STORAGE_PREFIX}${path}`;
}
