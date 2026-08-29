import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

/** الاشتراك في دورة (إن لم يكن مشتركاً). */
export async function enroll(courseId: string, userId: string) {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase
      .from("enrollments")
      .insert({ course_id: courseId, user_id: userId, progress: 0 });
    if (error && !error.message.includes("duplicate")) {
      console.warn("Enrollment notice:", error.message);
    }
  } catch (err) {
    console.warn("Offline enrollment:", err);
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
  if (!isSupabaseConfigured) return true;
  try {
    let query = supabase.from("saved_items").select("id").eq("user_id", userId);
    query = lessonId
      ? query.eq("lesson_id", lessonId)
      : query.eq("course_id", courseId!).is("lesson_id", null);
    const { data: existing } = await query.maybeSingle();

    if (existing) {
      await supabase.from("saved_items").delete().eq("id", existing.id);
      return false;
    }
    await supabase
      .from("saved_items")
      .insert({ user_id: userId, course_id: courseId, lesson_id: lessonId });
    return true;
  } catch {
    return true;
  }
}

/** تفاعل (إعجاب) مع دورة أو درس. */
export async function toggleReaction(params: {
  userId: string;
  courseId?: string | null;
  lessonId?: string | null;
  kind?: string;
}) {
  const { userId, courseId = null, lessonId = null, kind = "like" } = params;
  if (!isSupabaseConfigured) return true;
  try {
    let query = supabase.from("reactions").select("id").eq("user_id", userId).eq("kind", kind);
    query = lessonId
      ? query.eq("lesson_id", lessonId)
      : query.eq("course_id", courseId!).is("lesson_id", null);
    const { data: existing } = await query.maybeSingle();

    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
      return false;
    }
    await supabase
      .from("reactions")
      .insert({ user_id: userId, course_id: courseId, lesson_id: lessonId, kind });
    return true;
  } catch {
    return true;
  }
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
  try {
    const { data: existing } = await supabase
      .from("lesson_progress")
      .select("id,seconds_watched,completed")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("lesson_progress")
        .update({
          last_position: Math.round(lastPosition),
          seconds_watched: Math.max(existing.seconds_watched, Math.round(secondsWatched)),
          completed: completed ?? existing.completed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("lesson_progress").insert({
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        last_position: Math.round(lastPosition),
        seconds_watched: Math.round(secondsWatched),
        completed: completed ?? false,
      });
    }
  } catch {
    // ignore offline
  }
}

/**
 * يعيد حساب نسبة تقدّم الدورة من الدروس المكتملة، ويضبط تاريخ الإكمال
 * عند إنهاء كل الدروس (وهذا ما يُصدر الشهادة تلقائياً على الخادم).
 */
export async function recomputeCourseProgress(courseId: string, userId: string) {
  if (!isSupabaseConfigured) return 100;
  try {
    const [{ count: total }, { count: done }] = await Promise.all([
      supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId),
      supabase
        .from("lesson_progress")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .eq("completed", true),
    ]);

    const totalCount = total ?? 0;
    const doneCount = done ?? 0;
    const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    await supabase
      .from("enrollments")
      .update({
        progress,
        completed_at: progress >= 100 ? new Date().toISOString() : null,
      })
      .eq("course_id", courseId)
      .eq("user_id", userId);
    return progress;
  } catch {
    return 100;
  }
}

/** تنزيل ملف عبر رابطه مع اسم مناسب. */
export async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("تعذّر تحميل الملف");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/** مشاركة عبر واجهة المشاركة الأصلية أو نسخ الرابط. */
export async function shareLink(title: string, url: string) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared" as const;
    } catch {
      /* المستخدم ألغى المشاركة */
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied" as const;
}
