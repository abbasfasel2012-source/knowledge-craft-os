import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Clock, Star, Play, FileText, Link as LinkIcon, HelpCircle,
  Bookmark, BookmarkCheck, Users, Award, Download, Headphones,
  FileBadge, ImageIcon, Video,
} from "lucide-react";

export const Route = createFileRoute("/course/$slug")({
  head: () => ({ meta: [{ title: "تفاصيل الدورة — مِرقاة" }] }),
  component: CourseDetail,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const { data: course } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, category:categories(name), instructor:profiles!courses_instructor_id_fkey(full_name,avatar_url,bio)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["course-lessons", slug],
    queryFn: async () => {
      const { data: c } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
      if (!c) return [];
      const { data, error } = await supabase
        .from("lessons")
        .select("id,title,type,duration_minutes,position,is_preview,section_id,summary")
        .eq("course_id", c.id)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["course-sections", slug],
    queryFn: async () => {
      const { data: c } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
      if (!c) return [];
      const { data, error } = await supabase
        .from("sections")
        .select("id,title,position")
        .eq("course_id", c.id)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: enrollment } = useQuery({
    enabled: !!user && !!course,
    queryKey: ["enrollment", user?.id, course?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user!.id)
        .eq("course_id", course!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: isSaved } = useQuery({
    enabled: !!user && !!course,
    queryKey: ["saved-course", user?.id, course?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_items")
        .select("id")
        .eq("user_id", user!.id)
        .eq("course_id", course!.id)
        .is("lesson_id", null)
        .maybeSingle();
      return !!data;
    },
  });

  const { data: qnaPosts } = useQuery({
    enabled: !!course,
    queryKey: ["qna", course?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qna_posts")
        .select("id,body,created_at,user_id,profiles!qna_posts_user_id_fkey(full_name,avatar_url),parent_id,is_answer")
        .eq("course_id", course!.id)
        .is("parent_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviews } = useQuery({
    enabled: !!course,
    queryKey: ["reviews", course?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,rating,body,created_at,user_id,profiles!reviews_user_id_fkey(full_name,avatar_url)")
        .eq("course_id", course!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user || !course) throw new Error("يجب تسجيل الدخول");
      const { error } = await supabase.from("enrollments").insert({ user_id: user.id, course_id: course.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم التسجيل في الدورة!");
      queryClient.invalidateQueries({ queryKey: ["enrollment"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !course) throw new Error("يجب تسجيل الدخول");
      if (isSaved) {
        await supabase.from("saved_items").delete().eq("user_id", user.id).eq("course_id", course.id).is("lesson_id", null);
      } else {
        await supabase.from("saved_items").insert({ user_id: user.id, course_id: course.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-course"] });
      toast.success(isSaved ? "تم إزالة الحفظ" : "تم حفظ الدورة");
    },
  });

  const [qnaBody, setQnaBody] = useState("");
  const qnaMutation = useMutation({
    mutationFn: async () => {
      if (!user || !course) throw new Error("يجب تسجيل الدخول");
      const { error } = await supabase.from("qna_posts").insert({ course_id: course.id, user_id: user.id, body: qnaBody });
      if (error) throw error;
    },
    onSuccess: () => {
      setQnaBody("");
      toast.success("تم نشر سؤالك");
      queryClient.invalidateQueries({ queryKey: ["qna"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!course) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">جارٍ تحميل الدورة...</p></div>;
  }

  const instructor = course.instructor as { full_name: string; avatar_url: string | null; bio: string | null } | null;
  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="px-4 pt-6">
      {course.cover_url && (
        <div className="mb-4 h-40 overflow-hidden rounded-2xl">
          <img src={course.cover_url} alt={course.title} className="h-full w-full object-cover" />
        </div>
      )}

      <h1 className="text-xl font-bold">{course.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{course.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {avgRating && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-gold" /> {avgRating} ({reviews?.length ?? 0})</span>}
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration_minutes} دقيقة</span>
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {course.level}</span>
        {course.certificate_enabled && <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5 text-gold" /> شهادة</span>}
        <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-foreground">{course.is_free ? "مجاني" : `${course.price} $`}</span>
      </div>

      <div className="mt-4 flex gap-2">
        {enrollment ? (
          <Button asChild className="flex-1 gold-gradient text-gold-foreground">
            <Link to="/learn/$courseId/$lessonId" params={{ courseId: course.id, lessonId: lessons?.[0]?.id ?? "" }}>
              <Play className="h-4 w-4" /> متابعة التعلّم
            </Link>
          </Button>
        ) : (
          <Button onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending || !user} className="flex-1 gold-gradient text-gold-foreground">
            {user ? "التسجيل في الدورة" : "سجّل دخول للتسجيل"}
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={() => saveMutation.mutate()} disabled={!user}>
          {isSaved ? <BookmarkCheck className="h-4 w-4 text-gold" /> : <Bookmark className="h-4 w-4" />}
        </Button>
      </div>

      <Tabs defaultValue="content" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">المحتوى</TabsTrigger>
          <TabsTrigger value="community">المجتمع</TabsTrigger>
          <TabsTrigger value="reviews">التقييمات</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          {course.description && (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">{course.description}</div>
          )}

          {course.gallery && Array.isArray(course.gallery) && (course.gallery as string[]).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold flex items-center gap-2"><ImageIcon className="h-4 w-4" /> معرض الصور</h3>
              <div className="grid grid-cols-3 gap-2">
                {(course.gallery as string[]).map((url, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-lg">
                    <img src={url} alt={`صورة ${i + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {course.brochure_url && (
            <a href={course.brochure_url} download className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm hover:bg-accent transition-colors">
              <Download className="h-4 w-4 text-gold" /> تحميل البروشور
            </a>
          )}

          <div>
            <h3 className="mb-2 text-sm font-bold">الدروس ({lessons?.length ?? 0})</h3>
            <div className="space-y-2">
              {sections && sections.length > 0 ? (
                sections.map((sec) => (
                  <div key={sec.id}>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">{sec.title}</p>
                    <div className="space-y-1">
                      {lessons?.filter((l) => l.section_id === sec.id).map((lesson) => (
                        <LessonRow key={lesson.id} lesson={lesson} courseId={course.id} enrolled={!!enrollment} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                lessons?.map((lesson) => (
                  <LessonRow key={lesson.id} lesson={lesson} courseId={course.id} enrolled={!!enrollment} />
                ))
              )}
              {(!lessons || lessons.length === 0) && <p className="py-4 text-center text-sm text-muted-foreground">لا توجد دروس بعد.</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="community" className="space-y-4">
          {user ? (
            <div className="space-y-2">
              <Textarea value={qnaBody} onChange={(e) => setQnaBody(e.target.value)} placeholder="اطرح سؤالك أو ابدأ نقاشاً..." className="min-h-[80px]" />
              <Button onClick={() => qnaMutation.mutate()} disabled={!qnaBody.trim() || qnaMutation.isPending} className="gold-gradient text-gold-foreground">نشر</Button>
            </div>
          ) : <p className="text-center text-sm text-muted-foreground">سجّل دخولك للمشاركة في النقاش.</p>}

          <div className="space-y-3">
            {qnaPosts?.map((post) => {
              const p = post as { id: string; body: string; created_at: string; profiles: { full_name: string; avatar_url: string | null } };
              return (
                <Card key={p.id} className="border-border">
                  <CardContent className="flex gap-3 p-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.profiles?.avatar_url ?? ""} />
                      <AvatarFallback>{p.profiles?.full_name?.[0] ?? "؟"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{p.profiles?.full_name}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar")}</span>
                      </div>
                      <p className="mt-1 text-sm">{p.body}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(!qnaPosts || qnaPosts.length === 0) && <p className="py-4 text-center text-sm text-muted-foreground">لا توجد أسئلة بعد. كن أول من يبدأ النقاش!</p>}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-3">
          {reviews?.map((rev) => {
            const r = rev as { id: string; rating: number; body: string; created_at: string; profiles: { full_name: string; avatar_url: string | null } };
            return (
              <Card key={r.id} className="border-border">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={r.profiles?.avatar_url ?? ""} />
                      <AvatarFallback>{r.profiles?.full_name?.[0] ?? "؟"}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold">{r.profiles?.full_name}</span>
                    <div className="mr-auto flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={"h-3 w-3 " + (i < r.rating ? "text-gold fill-gold" : "text-muted-foreground")} />
                      ))}
                    </div>
                  </div>
                  {r.body && <p className="mt-2 text-sm">{r.body}</p>}
                </CardContent>
              </Card>
            );
          })}
          {(!reviews || reviews.length === 0) && <p className="py-4 text-center text-sm text-muted-foreground">لا توجد تقييمات بعد.</p>}
        </TabsContent>
      </Tabs>

      {instructor && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-bold">المدرّب</h3>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={instructor.avatar_url ?? ""} />
              <AvatarFallback>{instructor.full_name?.[0] ?? "؟"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{instructor.full_name}</p>
              {instructor.bio && <p className="text-xs text-muted-foreground">{instructor.bio}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LessonRow({ lesson, courseId, enrolled }: {
  lesson: { id: string; title: string; type: string; duration_minutes: number; is_preview: boolean; summary: string | null };
  courseId: string;
  enrolled: boolean;
}) {
  const canWatch = enrolled || lesson.is_preview;
  return (
    <Link
      to={canWatch ? "/learn/$courseId/$lessonId" : "/course/$slug"}
      params={canWatch ? { courseId, lessonId: lesson.id } : { slug: "" }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-transform active:scale-[0.99]"
      onClick={(e) => { if (!canWatch) e.preventDefault(); }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {lesson.type === "video" ? <Video className="h-4 w-4" /> :
         lesson.type === "pdf" ? <FileBadge className="h-4 w-4" /> :
         lesson.type === "quiz" ? <HelpCircle className="h-4 w-4" /> :
         <FileText className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium">{lesson.title}</p>
        <p className="text-[11px] text-muted-foreground">{lesson.duration_minutes} د</p>
      </div>
      {lesson.is_preview && !enrolled && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">معاينة</span>}
    </Link>
  );
}
