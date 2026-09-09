import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  lessonId: z.string(),
  field: z.enum(["video", "audio", "pdf"]).default("video"),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PREFIX = "course-media://";

function toPath(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith(PREFIX)) return url.slice(PREFIX.length);
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/course-media\/(.+?)(?:\?|$)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Returns a signed URL for a free-preview lesson of a published course.
 * Public on purpose: only preview lessons of published courses are exposed.
 */
export const getPreviewMediaUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    if (!UUID_RE.test(data.lessonId)) return { url: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("id,is_preview,video_url,audio_url,pdf_url,course:courses(status)")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (!lesson || !lesson.is_preview) return { url: null };
    const course = Array.isArray(lesson.course) ? lesson.course[0] : lesson.course;
    if (course?.status !== "published") return { url: null };

    const raw =
      data.field === "video"
        ? lesson.video_url
        : data.field === "audio"
          ? lesson.audio_url
          : lesson.pdf_url;
    const path = toPath(raw);
    if (!path) return { url: raw ?? null };

    const { data: signed } = await supabaseAdmin.storage
      .from("course-media")
      .createSignedUrl(path, 60 * 60 * 6);
    return { url: signed?.signedUrl ?? null };
  });
