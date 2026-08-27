import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, BookOpen, CheckCircle2, LayoutDashboard, Star, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isStaff, ROLE_LABELS, useSession } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "ملفي الشخصي — مِرقاة" },
      { name: "description", content: "ملفك الشخصي وإحصائياتك وشهاداتك وإعداداتك في منصة مِرقاة." },
      { property: "og:title", content: "ملفي الشخصي — مِرقاة" },
      { property: "og:description", content: "تابع تقدمك وشهاداتك وإعداداتك." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isLoading, logout } = useSession();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    enabled: !!user?.id,
    queryKey: ["profile-stats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      const [enrollments, certificates, badges, profile] = await Promise.all([
        supabase.from("enrollments").select("progress,completed_at").eq("user_id", user.id),
        supabase.from("certificates").select("id").eq("user_id", user.id),
        supabase.from("user_badges").select("id").eq("user_id", user.id),
        supabase.from("profiles").select("points").eq("id", user.id).maybeSingle(),
      ]);
      return {
        courses: enrollments.data?.length ?? 0,
        completed: enrollments.data?.filter((e) => e.completed_at).length ?? 0,
        certificates: certificates.data?.length ?? 0,
        badges: badges.data?.length ?? 0,
        points: profile.data?.points ?? 0,
      };
    },
  });

  const { data: certificates, isLoading: certLoading } = useQuery({
    enabled: !!user?.id,
    queryKey: ["profile-certificates", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      const { data, error } = await supabase
        .from("certificates")
        .select("id,code,issued_at,course:courses(title)")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-bold">يرجى تسجيل الدخول</h1>
        <p className="text-sm text-muted-foreground">لعرض ملفك الشخصي</p>
        <Link to="/auth" className="rounded-full gold-gradient px-5 py-2 text-sm font-medium text-gold-foreground">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const statItems = [
    { label: "دورات", value: stats?.courses ?? 0, icon: BookOpen },
    { label: "مكتملة", value: stats?.completed ?? 0, icon: CheckCircle2 },
    { label: "شهادات", value: stats?.certificates ?? 0, icon: Award },
    { label: "نقاط", value: stats?.points ?? 0, icon: Star },
  ];

  return (
    <div className="space-y-6 px-4 py-6">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{user.full_name || user.email}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
            <span className="mt-2 inline-block rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          <div className="rounded-full bg-gold/10 p-3">
            <Award className="h-6 w-6 text-gold" />
          </div>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {statItems.map((s) => (
              <div key={s.label} className="rounded-lg bg-background p-3 text-center">
                <s.icon className="mx-auto h-4 w-4 text-gold" />
                <p className="mt-1 text-2xl font-bold text-gold">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isStaff(user.role) && (
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/admin"
            className="flex items-center justify-center gap-2 rounded-xl gold-gradient px-4 py-3 text-sm font-semibold text-gold-foreground"
          >
            <LayoutDashboard className="h-4 w-4" /> لوحة التحكم
          </Link>
          <Link
            to="/admin/courses"
            className="flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-card px-4 py-3 text-sm font-semibold text-gold"
          >
            <Upload className="h-4 w-4" /> رفع دورة
          </Link>
        </div>
      )}

      <Tabs defaultValue="certificates" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-lg bg-card">
          <TabsTrigger value="certificates">الشهادات</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="mt-4 space-y-3">
          {certLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : certificates && certificates.length > 0 ? (
            certificates.map((cert) => {
              const course = Array.isArray(cert.course) ? cert.course[0] : cert.course;
              return (
                <Link
                  key={cert.id}
                  to="/certificates/$code"
                  params={{ code: cert.code }}
                  className="flex items-center gap-3 rounded-xl border border-gold/30 bg-accent/20 p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full gold-gradient">
                    <Award className="h-5 w-5 text-gold-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{course?.title ?? "شهادة"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      رمز: {cert.code} • {new Date(cert.issued_at).toLocaleDateString("ar")}
                    </p>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <Award className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">لا توجد شهادات بعد</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-3">
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">الاسم الكامل</p>
              <p className="mt-1 text-sm font-semibold">{user.full_name || "لم يتم تعيين"}</p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground">البريد الإلكتروني</p>
              <p className="mt-1 text-sm font-semibold">{user.email}</p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground">نوع الحساب</p>
              <p className="mt-1 text-sm font-semibold">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>

          <Link
            to="/record"
            className="block rounded-lg border border-border bg-card px-4 py-2.5 text-center text-sm font-semibold"
          >
            عرض السجل الكامل
          </Link>

          <button
            onClick={async () => {
              await queryClient.cancelQueries();
              queryClient.clear();
              await logout();
            }}
            className="w-full rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            تسجيل الخروج
          </button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
