import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Download, Share2, Bookmark, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { CourseComments } from "@/components/CourseComments";
import { VideoUploadCard } from "@/components/VideoUploadCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/course/$slug")({
  head: () => ({
    meta: [
      { title: "الدورة — مِرقاة" },
      { name: "description", content: "عرض الدورة وفيديوهاتها ومرفقاتها" },
    ],
  }),
  component: CourseDetail,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Fetch course
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("slug", slug).single();
      if (error) throw error;
      return data;
    },
  });

  // Lessons are the canonical content table in the current database schema.
  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    enabled: !!course?.id,
    queryKey: ["lessons", course?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", course.id)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: comments = [] } = useQuery({
    enabled: !!course?.id && !!user?.id,
    queryKey: ["qna-posts", course?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qna_posts")
        .select("id,body,created_at,user_id,user:profiles(full_name,avatar_url)")
        .eq("course_id", course.id)
        .is("parent_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((comment) => {
        const author = Array.isArray(comment.user) ? comment.user[0] : comment.user;
        return {
          id: comment.id,
          author: author?.full_name || "متدرب",
          avatar: author?.avatar_url || undefined,
          content: comment.body,
          timestamp: new Date(comment.created_at).toLocaleDateString("ar-SA"),
          likes: 0,
        };
      });
    },
  });

  const { data: savedCourse } = useQuery({
    enabled: !!course?.id && !!user?.id,
    queryKey: ["saved-course", user?.id, course?.id],
    queryFn: async () => {
      if (!user?.id || !course?.id) return null;
      const { data, error } = await supabase
        .from("saved_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .is("lesson_id", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setIsBookmarked(!!savedCourse);
  }, [savedCourse]);

  const videoLessons = lessons?.filter((lesson) => lesson.type === "video") ?? [];
  const currentVideo = videoLessons[currentVideoIndex];
  const materials =
    lessons?.filter(
      (lesson) => lesson.type === "pdf" && (lesson.pdf_url || lesson.attachment_url),
    ) ?? [];

  const toggleBookmark = async () => {
    if (!user?.id || !course?.id) {
      toast.error("سجّل الدخول لحفظ الدورة");
      return;
    }
    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from("saved_items")
          .delete()
          .eq("user_id", user.id)
          .eq("course_id", course.id)
          .is("lesson_id", null);
        if (error) throw error;
        setIsBookmarked(false);
      } else {
        const { error } = await supabase
          .from("saved_items")
          .insert({ user_id: user.id, course_id: course.id });
        if (error) throw error;
        setIsBookmarked(true);
      }
      await queryClient.invalidateQueries({ queryKey: ["saved-course", user.id, course.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث المحفوظات");
    }
  };

  const handleShare = async () => {
    const shareData = { title: course.title, text: course.summary, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("تم نسخ رابط الدورة");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("تعذر مشاركة الدورة");
    }
  };

  const handleDownload = () => {
    const url = course.brochure_url || currentVideo?.pdf_url || currentVideo?.attachment_url;
    if (!url) {
      toast.info("لا يوجد ملف قابل للتنزيل لهذه الدورة");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
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
      {/* Video Player Section */}
      <div className="space-y-3">
        {currentVideo?.video_url ? (
          <div className="relative overflow-hidden rounded-2xl bg-black aspect-video">
            <video
              ref={videoRef}
              src={currentVideo.video_url}
              controls
              className="w-full h-full object-cover"
              poster={currentVideo.thumbnail_url || course.cover_url}
            />
            <div className="absolute right-3 top-3">
              <button className="rounded-lg gold-gradient p-2 text-gold-foreground shadow-lg">
                <Play className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="aspect-video rounded-2xl bg-muted flex items-center justify-center">
            <div className="text-center">
              <Play className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">لا يوجد فيديو متاح</p>
            </div>
          </div>
        )}
      </div>

      {/* Course Header */}
      <div>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{course.summary}</p>
      </div>

      {/* Course Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => void toggleBookmark()}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
            isBookmarked
              ? "gold-gradient border-transparent text-gold-foreground"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <Bookmark className="h-4 w-4" />
          {isBookmarked ? "محفوظ" : "حفظ"}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          تحميل
        </button>
        <button
          onClick={() => void handleShare()}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <Share2 className="h-4 w-4" />
          مشاركة
        </button>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-lg bg-card">
          <TabsTrigger value="videos">الفيديوهات</TabsTrigger>
          <TabsTrigger value="materials">المرفقات</TabsTrigger>
          <TabsTrigger value="comments">
            <MessageCircle className="h-4 w-4" />
            <span className="ml-2">{comments?.length || 0}</span>
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-3 mt-4">
          {lessonsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : videoLessons.length > 0 ? (
            <div className="space-y-2">
              {videoLessons.map((lesson, index) => (
                <button
                  key={lesson.id}
                  onClick={() => setCurrentVideoIndex(index)}
                  className={`w-full flex gap-3 rounded-lg border p-3 transition-colors ${
                    index === currentVideoIndex
                      ? "border-gold bg-gold/10"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <Play className="absolute inset-0 m-auto h-4 w-4 text-gold opacity-60" />
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="line-clamp-1 text-sm font-semibold">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">{lesson.duration_minutes} د</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">لا توجد فيديوهات بعد</p>
            </div>
          )}
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-3 mt-4">
          {materials && materials.length > 0 ? (
            <div className="space-y-2">
              {materials.map((material) => (
                <a
                  key={material.id}
                  href={material.pdf_url || material.attachment_url || "#"}
                  download
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold">{material.title}</p>
                    <p className="text-xs text-muted-foreground">ملف PDF</p>
                  </div>
                  <Download className="h-4 w-4 text-gold" />
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">لا توجد مرفقات بعد</p>
            </div>
          )}
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="mt-4">
          <CourseComments
            courseId={course.id}
            comments={comments}
            onComment={async (content) => {
              if (!user?.id) return;
              const { error } = await supabase
                .from("qna_posts")
                .insert({ course_id: course.id, user_id: user.id, body: content });
              if (error) throw error;
              await queryClient.invalidateQueries({ queryKey: ["qna-posts", course.id] });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Admin Upload Section */}
      {user && ["owner", "instructor", "moderator"].includes(user.role) && (
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="mb-4 text-lg font-bold">إدارة الدورة</h3>
          <VideoUploadCard
            courseId={course.id}
            onUploaded={() => queryClient.invalidateQueries({ queryKey: ["lessons", course.id] })}
          />
        </div>
      )}
    </div>
  );
}
