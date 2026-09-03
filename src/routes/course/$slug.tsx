import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Download,
  Share2,
  Bookmark,
  MessageCircle,
  Heart,
  CheckCircle2,
  FileText,
  Headphones,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { isStaff, useSession } from "@/lib/session";
import { useMediaUrl, resolveMedia } from "@/lib/media";
import { CourseComments } from "@/components/CourseComments";
import { VideoUploadCard } from "@/components/VideoUploadCard";
import { LessonAiAssistant } from "@/components/LessonAiAssistant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DEMO_COURSES } from "@/lib/demo-data";
import {
  downloadFile,
  enroll,
  recomputeCourseProgress,
  saveLessonProgress,
  shareLink,
  toggleReaction,
  toggleSaved,
} from "@/lib/learn";

export const Route = createFileRoute("/course/$slug")({
  head: () => ({
    meta: [
      { title: "الدورة — تدريب" },
      { name: "description", content: "شاهد دروس الدورة، حمّل المرفقات، واسأل المساعد الذكي." },
      { property: "og:title", content: "دورة تدريبية على تدريب" },
      { property: "og:description", content: "دروس مرئية، مرفقات، اختبارات ومساعد ذكي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CourseDetail,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [busy, setBusy] = useState(false);

  const demoCourse = DEMO_COURSES.find((c) => c.slug === slug);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      if (!isSupabaseConfigured) return demoCourse ?? null;
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (error || !data) return demoCourse ?? null;
        return data;
      } catch {
        return demoCourse ?? null;
      }
    },
  });

  const courseId = course?.id;

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    enabled: !!courseId,
    queryKey: ["lessons", courseId],
    queryFn: async () => {
      if (!isSupabaseConfigured || demoCourse?.id === courseId) {
        return (demoCourse?.lessons ?? []) as unknown as {
          id: string;
          course_id: string;
          title: string;
          summary: string | null;
          duration_minutes: number | null;
          position: number;
          type: string;
          video_url?: string | null;
          audio_url?: string | null;
          pdf_url?: string | null;
          attachment_url?: string | null;
          is_preview?: boolean | null;
        }[];
      }
      try {
        const { data, error } = await supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseId!)
          .order("position");
        if (error || !data?.length) {
          return (demoCourse?.lessons ?? []) as unknown as {
            id: string;
            course_id: string;
            title: string;
            summary: string | null;
            duration_minutes: number | null;
            position: number;
            type: string;
            video_url?: string | null;
            audio_url?: string | null;
            pdf_url?: string | null;
            attachment_url?: string | null;
            is_preview?: boolean | null;
          }[];
        }
        return data;
      } catch {
        return (demoCourse?.lessons ?? []) as unknown as {
          id: string;
          course_id: string;
          title: string;
          summary: string | null;
          duration_minutes: number | null;
          position: number;
          type: string;
          video_url?: string | null;
          audio_url?: string | null;
          pdf_url?: string | null;
          attachment_url?: string | null;
          is_preview?: boolean | null;
        }[];
      }
    },
  });

  const { data: enrollment } = useQuery({
    enabled: !!courseId && !!user,
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("enrollments")
          .select("id,progress,completed_at")
          .eq("course_id", courseId!)
          .eq("user_id", user!.id)
          .maybeSingle();
        return data;
      } catch {
        return null;
      }
    },
  });

  const { data: progressRows } = useQuery({
    enabled: !!courseId && !!user,
    queryKey: ["lesson-progress", courseId, user?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("lesson_progress")
          .select("lesson_id,completed,last_position")
          .eq("course_id", courseId!)
          .eq("user_id", user!.id);
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: saved } = useQuery({
    enabled: !!courseId && !!user,
    queryKey: ["saved-course", courseId, user?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("saved_items")
          .select("id")
          .eq("user_id", user!.id)
          .eq("course_id", courseId!)
          .is("lesson_id", null)
          .maybeSingle();
        return !!data;
      } catch {
        return false;
      }
    },
  });

  const { data: liked } = useQuery({
    enabled: !!courseId && !!user,
    queryKey: ["liked-course", courseId, user?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("reactions")
          .select("id")
          .eq("user_id", user!.id)
          .eq("course_id", courseId!)
          .is("lesson_id", null)
          .eq("kind", "like")
          .maybeSingle();
        return !!data;
      } catch {
        return false;
      }
    },
  });

  const { data: quizzes } = useQuery({
    enabled: !!courseId,
    queryKey: ["course-quizzes", courseId],
    queryFn: async () => {
      if (!isSupabaseConfigured || demoCourse?.id === courseId) {
        return (demoCourse?.quizzes ?? []) as unknown as {
          id: string;
          title: string;
          description: string | null;
          pass_score: number;
          time_limit_minutes: number | null;
          max_attempts: number | null;
        }[];
      }
      try {
        const { data } = await supabase
          .from("quizzes")
          .select("id,title,description,pass_score,time_limit_minutes,max_attempts")
          .eq("course_id", courseId!)
          .eq("is_active", true)
          .order("created_at");
        if (!data?.length) {
          return (demoCourse?.quizzes ?? []) as unknown as {
            id: string;
            title: string;
            description: string | null;
            pass_score: number;
            time_limit_minutes: number | null;
            max_attempts: number | null;
          }[];
        }
        return data;
      } catch {
        return (demoCourse?.quizzes ?? []) as unknown as {
          id: string;
          title: string;
          description: string | null;
          pass_score: number;
          time_limit_minutes: number | null;
          max_attempts: number | null;
        }[];
      }
    },
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    enabled: !!courseId,
    queryKey: ["qna", courseId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("qna_posts")
          .select("id, body, created_at, user_id")
          .eq("course_id", courseId!)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const ids = [...new Set((data || []).map((r) => r.user_id))];
        const authors = new Map<string, { full_name: string | null; avatar_url: string | null }>();
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", ids);
          (profs || []).forEach((pr) => authors.set(pr.id, pr));
        }
        return (data || []).map((row) => ({
          id: row.id,
          author: authors.get(row.user_id)?.full_name || "مستخدم",
          avatar: authors.get(row.user_id)?.avatar_url ?? undefined,
          content: row.body,
          timestamp: new Date(row.created_at).toLocaleDateString("ar"),
          likes: 0,
        }));
      } catch {
        return [
          {
            id: "c-demo-1",
            author: "أحمد المنصوري",
            avatar: undefined,
            content: "دورة ممتازة وشرح وافي ومبسط، شكراً جزيلاً!",
            timestamp: "اليوم",
            likes: 4,
          },
        ];
      }
    },
  });

  const playable = lessons?.filter((l) => l.video_url || l.audio_url) ?? [];
  const current = playable[currentIndex];
  const currentVideoSrc = useMediaUrl(current?.video_url);
  const currentAudioSrc = useMediaUrl(current?.audio_url);
  const posterSrc = useMediaUrl(course?.cover_url);
  const completedIds = new Set(
    (progressRows ?? []).filter((p) => p.completed).map((p) => p.lesson_id),
  );
  const materials = (lessons ?? [])
    .flatMap((l) => [
      l.pdf_url
        ? { id: `${l.id}-pdf`, title: `${l.title} — ملف PDF`, url: l.pdf_url, kind: "PDF" }
        : null,
      l.attachment_url
        ? { id: `${l.id}-att`, title: `${l.title} — مرفق`, url: l.attachment_url, kind: "مرفق" }
        : null,
      l.audio_url
        ? { id: `${l.id}-aud`, title: `${l.title} — بودكاست`, url: l.audio_url, kind: "صوت" }
        : null,
    ])
    .filter(Boolean) as { id: string; title: string; url: string; kind: string }[];
  if (course?.brochure_url) {
    materials.unshift({
      id: "brochure",
      title: "كتيّب الدورة",
      url: course.brochure_url,
      kind: "PDF",
    });
  }

  useEffect(() => {
    // استئناف من آخر موضع مشاهدة محفوظ
    const row = progressRows?.find((p) => p.lesson_id === current?.id);
    if (videoRef.current && row?.last_position) videoRef.current.currentTime = row.last_position;
  }, [current?.id, progressRows]);

  const requireLogin = () => {
    if (!user) {
      toast.error("سجّل دخولك أولاً");
      return true;
    }
    return false;
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["enrollment"] });
    queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
    queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
  };

  const handleEnroll = async () => {
    if (requireLogin() || !courseId) return;
    setBusy(true);
    try {
      await enroll(courseId, user!.id);
      toast.success("تم تسجيلك في الدورة");
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر التسجيل");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (requireLogin() || !courseId) return;
    try {
      const now = await toggleSaved({ userId: user!.id, courseId });
      toast.success(now ? "تم الحفظ" : "أُزيل من المحفوظات");
      queryClient.invalidateQueries({ queryKey: ["saved-course"] });
      queryClient.invalidateQueries({ queryKey: ["my-saved"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    }
  };

  const handleLike = async () => {
    if (requireLogin() || !courseId) return;
    try {
      const now = await toggleReaction({ userId: user!.id, courseId });
      toast.success(now ? "أعجبتك الدورة" : "أُلغي الإعجاب");
      queryClient.invalidateQueries({ queryKey: ["liked-course"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر التفاعل");
    }
  };

  const handleShare = async () => {
    const res = await shareLink(course?.title ?? "دورة", window.location.href);
    if (res === "copied") toast.success("تم نسخ الرابط");
  };

  const handleComplete = async () => {
    if (requireLogin() || !courseId || !current) return;
    setBusy(true);
    try {
      if (!enrollment) await enroll(courseId, user!.id);
      await saveLessonProgress({
        userId: user!.id,
        courseId,
        lessonId: current.id,
        lastPosition: Math.round(videoRef.current?.currentTime ?? 0),
        secondsWatched: Math.round(videoRef.current?.currentTime ?? 0),
        completed: true,
      });
      const p = await recomputeCourseProgress(courseId, user!.id);
      toast.success(p >= 100 ? "أكملت الدورة! تحقق من شهادتك في السجل." : "تم تعليم الدرس كمكتمل");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setBusy(false);
    }
  };

  const persistPosition = () => {
    if (!user || !courseId || !current || !enrollment) return;
    const t = videoRef.current?.currentTime ?? 0;
    void saveLessonProgress({
      userId: user.id,
      courseId,
      lessonId: current.id,
      lastPosition: t,
      secondsWatched: t,
    }).catch(() => undefined);
  };

  const handleAddComment = async (content: string) => {
    if (requireLogin() || !courseId) return;
    const { error } = await supabase
      .from("qna_posts")
      .insert({ course_id: courseId, user_id: user!.id, body: content });
    if (error) {
      toast.error(error.message);
      return;
    }
    refetchComments();
  };

  const handleDownload = async (url: string, title: string) => {
    try {
      await downloadFile(url, title);
    } catch {
      const signed = (await resolveMedia(url)) ?? url;
      window.open(signed, "_blank");
    }
  };

  if (courseLoading) {
    return (
      <div className="space-y-4 px-4 py-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h2 className="text-xl font-bold">الدورة غير موجودة</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            عذراً، لا يمكننا العثور على هذه الدورة.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {/* المشغّل */}
      {current?.video_url && currentVideoSrc && !videoError ? (
        <div className="overflow-hidden rounded-2xl bg-black aspect-video">
          <video
            ref={videoRef}
            src={currentVideoSrc}
            controls
            playsInline
            className="h-full w-full object-contain"
            poster={posterSrc}
            onError={() => setVideoError(true)}
            onPause={persistPosition}
            onEnded={handleComplete}
          />
        </div>
      ) : current?.audio_url && !current.video_url ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Headphones className="h-4 w-4 text-gold" /> {current.title}
          </p>
          <audio src={currentAudioSrc} controls className="w-full" />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-2xl bg-muted">
          <div className="px-4 text-center">
            <Play className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {videoError ? "تعذّر تشغيل هذا الدرس، الرابط قد يكون منتهياً." : "لا يوجد فيديو متاح"}
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{course.summary}</p>
        {enrollment && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full gold-gradient" style={{ width: `${enrollment.progress}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{enrollment.progress}% مكتمل</p>
          </div>
        )}
      </div>

      {/* الإجراءات */}
      {!enrollment ? (
        <Button
          onClick={handleEnroll}
          disabled={busy}
          className="w-full gold-gradient text-gold-foreground"
        >
          <GraduationCap className="h-4 w-4" />{" "}
          {course.is_free ? "التسجيل مجاناً" : "التسجيل في الدورة"}
        </Button>
      ) : (
        current && (
          <Button
            onClick={handleComplete}
            disabled={busy || completedIds.has(current.id)}
            variant={completedIds.has(current.id) ? "outline" : "default"}
            className={
              completedIds.has(current.id) ? "w-full" : "w-full gold-gradient text-gold-foreground"
            }
          >
            <CheckCircle2 className="h-4 w-4" />
            {completedIds.has(current.id) ? "هذا الدرس مكتمل" : "تعليم الدرس كمكتمل"}
          </Button>
        )
      )}

      <div className="flex gap-2">
        <ActionButton
          active={!!saved}
          onClick={handleSave}
          icon={<Bookmark className="h-4 w-4" />}
          label={saved ? "محفوظ" : "حفظ"}
        />
        <ActionButton
          active={!!liked}
          onClick={handleLike}
          icon={<Heart className="h-4 w-4" />}
          label={liked ? "أعجبني" : "إعجاب"}
        />
        <ActionButton
          active={false}
          onClick={handleShare}
          icon={<Share2 className="h-4 w-4" />}
          label="مشاركة"
        />
      </div>

      <Tabs defaultValue="lessons" className="w-full">
        <TabsList className="flex w-full items-center justify-start gap-1 overflow-x-auto rounded-lg bg-card scrollbar-hide">
          <TabsTrigger value="lessons" className="shrink-0 px-2.5 text-xs sm:text-sm">
            الدروس
          </TabsTrigger>
          <TabsTrigger value="materials" className="shrink-0 px-2.5 text-xs sm:text-sm">
            المرفقات
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="shrink-0 px-2.5 text-xs sm:text-sm">
            الاختبارات
          </TabsTrigger>
          <TabsTrigger value="comments" className="shrink-0 px-2.5 text-xs sm:text-sm">
            <MessageCircle className="h-4 w-4" />
            <span className="ms-1 text-[11px]">{comments?.length || 0}</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="shrink-0 px-2.5 text-xs sm:text-sm">
            المساعد
          </TabsTrigger>
        </TabsList>

        {/* الدروس */}
        <TabsContent value="lessons" className="mt-4 space-y-2">
          {lessonsLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : lessons && lessons.length > 0 ? (
            lessons.map((lesson) => {
              const playIndex = playable.findIndex((p) => p.id === lesson.id);
              const isCurrent = playIndex >= 0 && playIndex === currentIndex;
              return (
                <button
                  key={lesson.id}
                  onClick={() => {
                    if (playIndex >= 0) {
                      setCurrentIndex(playIndex);
                      setVideoError(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className={`flex w-full gap-3 rounded-lg border p-3 text-right transition-colors ${
                    isCurrent ? "border-gold bg-gold/10" : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {completedIds.has(lesson.id) ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : lesson.type === "video" ? (
                      <Play className="h-4 w-4 text-gold" />
                    ) : lesson.type === "quiz" ? (
                      <HelpCircle className="h-4 w-4 text-gold" />
                    ) : (
                      <FileText className="h-4 w-4 text-gold" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {lesson.duration_minutes} د{lesson.is_preview ? " • معاينة مجانية" : ""}
                    </p>
                    {lesson.summary && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {lesson.summary}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <EmptyBox
              text={
                enrollment || isStaff(user?.role)
                  ? "لا توجد دروس بعد"
                  : "سجّل في الدورة لعرض الدروس"
              }
            />
          )}
        </TabsContent>

        {/* المرفقات */}
        <TabsContent value="materials" className="mt-4 space-y-2">
          {materials.length > 0 ? (
            materials.map((m) => (
              <button
                key={m.id}
                onClick={() => handleDownload(m.url, m.title)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-3 text-right transition-colors hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-semibold">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.kind}</p>
                </div>
                <Download className="h-4 w-4 text-gold" />
              </button>
            ))
          ) : (
            <EmptyBox text="لا توجد مرفقات بعد" />
          )}
        </TabsContent>

        {/* الاختبارات */}
        <TabsContent value="quizzes" className="mt-4 space-y-2">
          {quizzes && quizzes.length > 0 ? (
            quizzes.map((q) => (
              <Link
                key={q.id}
                to="/quiz/$id"
                params={{ id: q.id }}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-semibold">{q.title}</p>
                  <p className="text-xs text-muted-foreground">
                    نسبة النجاح {q.pass_score}% • {q.time_limit_minutes} دقيقة
                  </p>
                </div>
                <HelpCircle className="h-4 w-4 text-gold" />
              </Link>
            ))
          ) : (
            <EmptyBox text="لا توجد اختبارات لهذه الدورة" />
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <CourseComments
            courseId={course.id}
            comments={comments || []}
            onComment={handleAddComment}
          />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <LessonAiAssistant courseTitle={course.title} lessons={lessons || []} />
        </TabsContent>
      </Tabs>

      {isStaff(user?.role) && (
        <div className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold">إدارة الدورة</h3>
            <Link
              to="/admin/courses/$id"
              params={{ id: course.id }}
              className="text-xs font-semibold text-gold hover:underline"
            >
              تحرير كامل ←
            </Link>
          </div>
          <VideoUploadCard courseId={course.id} />
        </div>
      )}
    </div>
  );
}

function ActionButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "gold-gradient border-transparent text-gold-foreground"
          : "border-border bg-card text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
