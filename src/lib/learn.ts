import { resolveMedia } from "@/lib/media";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

/** الاشتراك في دورة (إن لم يكن مشتركاً). */
export async function enroll(courseId: string, userId: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from("enrollments")
    .insert({ course_id: courseId, user_id: userId, progress: 0 });
  if (error && !error.message.includes("duplicate") && !error.code?.includes("23505")) {
    throw new Error(error.message);
  }
}

export async function getEnrollment(courseId: string, userId: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase
      .from("enrollments")
      .select("id,progress,completed_at")
      .eq("course_id", courseId)
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

/** حفظ / إلغاء حفظ دورة أو درس. */
export async function toggleSaved(params: {
  userId: string;
  courseId?: string | null;
  lessonId?: string | null;
}) {
  const { userId, courseId = null, lessonId = null } = params;
  if (!isSupabaseConfigured) throw new Error("قاعدة البيانات غير مهيأة");
  let query = supabase.from("saved_items").select("id").eq("user_id", userId);
  query = lessonId
    ? query.eq("lesson_id", lessonId)
    : query.eq("course_id", courseId!).is("lesson_id", null);
  const { data: existing, error: readError } = await query.maybeSingle();
  if (readError) throw readError;
  if (existing) {
    const { error } = await supabase.from("saved_items").delete().eq("id", existing.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("saved_items")
    .insert({ user_id: userId, course_id: courseId, lesson_id: lessonId });
  if (error) throw error;
  return true;
}

/** تفاعل (إعجاب) مع دورة أو درس. */
export async function toggleReaction(params: {
  userId: string;
  courseId?: string | null;
  lessonId?: string | null;
  kind?: string;
}) {
  const { userId, courseId = null, lessonId = null, kind = "like" } = params;
  if (!isSupabaseConfigured) throw new Error("قاعدة البيانات غير مهيأة");
  let query = supabase.from("reactions").select("id").eq("user_id", userId).eq("kind", kind);
  query = lessonId
    ? query.eq("lesson_id", lessonId)
    : query.eq("course_id", courseId!).is("lesson_id", null);
  const { data: existing, error: readError } = await query.maybeSingle();
  if (readError) throw readError;
  if (existing) {
    const { error } = await supabase.from("reactions").delete().eq("id", existing.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("reactions")
    .insert({ user_id: userId, course_id: courseId, lesson_id: lessonId, kind });
  if (error) throw error;
  return true;
}

/** حفظ موضع المشاهدة وحالة الإكمال للدرس. */
export async function saveLessonProgress(params: {
  userId: string;
  courseId: string;
  lessonId: string;
  lastPosition: number;
  secondsWatched?: number;
  completed?: boolean;
}) {
  const { userId, courseId, lessonId, lastPosition, secondsWatched = 0, completed } = params;
  if (!isSupabaseConfigured) return;
  const completedAt = completed ? new Date().toISOString() : undefined;
  const upsertPayload: Record<string, unknown> = {
    user_id: userId,
    course_id: courseId,
    lesson_id: lessonId,
    last_position: Math.round(lastPosition),
    seconds_watched: Math.round(secondsWatched),
    updated_at: new Date().toISOString(),
  };
  if (completed !== undefined) upsertPayload["completed"] = completed;
  if (completedAt) upsertPayload["completed_at"] = completedAt;
  const { error } = await supabase.from("lesson_progress").upsert(
    upsertPayload as never,
    { onConflict: "user_id,lesson_id" },
  );
  if (error) {
    console.warn("lesson_progress upsert:", error.message);
  }
}

/** إعادة حساب تقدم المستخدم في الدورة وتحديث enrollments. */
export async function recomputeCourseProgress(
  courseId: string,
  userId: string,
): Promise<number> {
  if (!isSupabaseConfigured) return 0;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);
  const total = lessons?.length ?? 0;
  if (total === 0) return 0;

  const { data: progressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id,completed")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .eq("completed", true);

  const completedCount = progressRows?.length ?? 0;
  const progress = Math.min(100, Math.floor((completedCount / total) * 100));

  const updatePayload: Record<string, unknown> = { progress };
  if (progress >= 100) updatePayload.completed_at = new Date().toISOString();

  await supabase
    .from("enrollments")
    .update(updatePayload as never)
    .eq("course_id", courseId)
    .eq("user_id", userId);

  // منح الشهادة تلقائياً عند الإتمام
  if (progress >= 100) {
    await supabase
      .from("certificates")
      .upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id" })
      .then(() => undefined); // تجاهل الخطأ إن كانت الشهادة موجودة
  }

  return progress;
}

/** مشاركة رابط الدورة. */
export async function shareLink(title: string, url: string): Promise<"shared" | "copied"> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch {
      // ignored
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

/** تنزيل ملف من مسار Storage. */
export async function downloadFile(url: string, filename: string) {
  const resolved = (await resolveMedia(url)) ?? url;
  const res = await fetch(resolved);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
