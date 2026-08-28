import { supabase } from "@/integrations/supabase/client";

const BUCKET = "course-media";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

/**
 * Uploads a file to the private course-media bucket and returns a long-lived
 * signed URL (the bucket cannot be public, so getPublicUrl does not work).
 */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const path = `${folder}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "تعذّر إنشاء رابط الملف");
  return data.signedUrl;
}
