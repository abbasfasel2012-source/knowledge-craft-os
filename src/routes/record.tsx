import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { History, CheckCircle, Bookmark, Award, Star } from "lucide-react";

export const Route = createFileRoute("/record")({
  head: () => ({ meta: [{ title: "السجل — مِرقاة" }] }),
  component: RecordPage,
});

function RecordPage() {
  const { user, loading } = useSession();

  const { data: enrollments } = useQuery({
    enabled: !!user,
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("progress,completed_at,created_at,course:courses(id,title,slug,cover_url,duration_minutes)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: savedItems } = useQuery({
    enabled: !!user,
    queryKey: ["my-saved", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_items")
        .select("id,course_id,lesson_id,created_at,course:courses(title,slug,cover_url),lesson:lessons(title)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: certificates } = useQuery({
    enabled: !!user,
    queryKey: ["my-certificates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("code,issued_at,course:courses(title,slug)")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: badges } = useQuery({
    enabled: !!user,
    queryKey: ["my-badges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("earned_at,badge:badges(name,description,icon)")
        .eq("user_id", user!.id)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">جارٍ التحميل...</p></div>;

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">سجّل دخولك لعرض سجلك.</p>
        <Link to="/auth" className="rounded-full gold-gradient px-5 py-2 text-sm font-medium text-gold-foreground">تسجيل الدخول</Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-lg font-bold">سجل نشاطي</h1>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-4">
          <TabsTrigger value="history" className="text-xs"><History className="h-3 w-3" /></TabsTrigger>
          <TabsTrigger value="completed" className="text-xs"><CheckCircle className="h-3 w-3" /></TabsTrigger>
          <TabsTrigger value="saved" className="text-xs"><Bookmark className="h-3 w-3" /></TabsTrigger>
          <TabsTrigger value="awards" className="text-xs"><Award className="h-3 w-3" /></TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-3">
          <h2 className="text-sm font-bold">الدورات المسجّلة</h2>
          {enrollments?.map((e, i) => {
            const c = e.course as { id: string; title: string; slug: string; cover_url: string | null; duration_minutes: number } | null;
            if (!c) return null;
            return (
              <Link key={i} to="/course/$slug" params={{ slug: c.slug }}>
                <Card className="border-border mb-2">
                  <CardContent className="flex gap-3 p-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">{c.cover_url && <img src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />}</div>
                    <div className="flex-1">
                      <p className="line-clamp-1 text-sm font-semibold">{c.title}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full gold-gradient" style={{ width: `${e.progress}%` }} /></div>
                      <p className="mt-1 text-[10px] text-muted-foreground">{e.progress}% مكتمل</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {(!enrollments || enrollments.length === 0) && <p className="py-8 text-center text-sm text-muted-foreground">لم تسجّل في أي دورة بعد.</p>}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          <h2 className="text-sm font-bold">الدورات المكتملة</h2>
          {enrollments?.filter((e) => e.completed_at).map((e, i) => {
            const c = e.course as { id: string; title: string; slug: string; cover_url: string | null } | null;
            if (!c) return null;
            return (
              <Link key={i} to="/course/$slug" params={{ slug: c.slug }}>
                <Card className="border-green-500/30 bg-green-500/5 mb-2">
                  <CardContent className="flex gap-3 p-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">{c.cover_url && <img src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />}</div>
                    <div className="flex-1">
                      <p className="line-clamp-1 text-sm font-semibold">{c.title}</p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-green-600"><CheckCircle className="h-3 w-3" /> أكملت في {new Date(e.completed_at!).toLocaleDateString("ar")}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {(!enrollments || enrollments.filter((e) => e.completed_at).length === 0) && <p className="py-8 text-center text-sm text-muted-foreground">لم تكمل أي دورة بعد.</p>}
        </TabsContent>

        <TabsContent value="saved" className="space-y-3">
          <h2 className="text-sm font-bold">المحفوظات</h2>
          {savedItems?.map((s, i) => {
            const c = s.course as { title: string; slug: string; cover_url: string | null } | null;
            const l = s.lesson as { title: string } | null;
            return (
              <Link key={i} to={c ? "/course/$slug" : "/"} params={c ? { slug: c.slug } : {}}>
                <Card className="border-border mb-2">
                  <CardContent className="flex gap-3 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent"><Bookmark className="h-4 w-4 text-gold" /></div>
                    <div className="flex-1"><p className="text-sm font-semibold">{l?.title ?? c?.title ?? "عنصر محفوظ"}</p>{c && <p className="text-[10px] text-muted-foreground">{c.title}</p>}</div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {(!savedItems || savedItems.length === 0) && <p className="py-8 text-center text-sm text-muted-foreground">لم تحفظ أي عنصر بعد.</p>}
        </TabsContent>

        <TabsContent value="awards" className="space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-bold flex items-center gap-2"><Award className="h-4 w-4 text-gold" /> الشهادات</h2>
            {certificates?.map((cert, i) => {
              const c = cert.course as { title: string; slug: string } | null;
              return (
                <Link key={i} to="/certificates/$code" params={{ code: cert.code }}>
                  <Card className="border-gold/30 bg-accent/20 mb-2">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full gold-gradient"><Award className="h-5 w-5 text-gold-foreground" /></div>
                      <div className="flex-1"><p className="text-sm font-semibold">{c?.title ?? "شهادة"}</p><p className="text-[10px] text-muted-foreground">رمز: {cert.code}</p></div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            {(!certificates || certificates.length === 0) && <p className="py-4 text-center text-sm text-muted-foreground">لم تحصل على شهادات بعد.</p>}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-bold flex items-center gap-2"><Star className="h-4 w-4 text-gold" /> الشارات</h2>
            <div className="grid grid-cols-2 gap-2">
              {badges?.map((ub, i) => {
                const b = ub.badge as { name: string; description: string; icon: string } | null;
                return (
                  <Card key={i} className="border-border bg-card">
                    <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full gold-gradient"><Award className="h-5 w-5 text-gold-foreground" /></div>
                      <p className="text-xs font-semibold">{b?.name}</p>
                      <p className="text-[9px] text-muted-foreground">{b?.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
              {(!badges || badges.length === 0) && <div className="col-span-2 py-4 text-center text-sm text-muted-foreground">لم تكسب شارات بعد.</div>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
