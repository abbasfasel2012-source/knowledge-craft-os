import { supabase } from "@/integrations/supabase/client";

const BUCKET = "course-media";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function safeName(name: string) {
  return name.replace(/[^\w.-]+/g, "_");
}

/**
 * Uploads a file to the course-media bucket and returns a long-lived signed URL.
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
      const formData = new FormData();
      formData.append("", file);
      xhr.send(formData);
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

  if (onProgress) onProgress(95);

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl)
    throw new Error(signError?.message ?? "تعذّر إنشاء رابط الملف");

  if (onProgress) onProgress(100);
  return data.signedUrl;
}
