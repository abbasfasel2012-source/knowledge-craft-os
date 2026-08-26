import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Calendar, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { CertificateCard } from "@/components/CertificateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "ملفي الشخصي — مِرقاة" },
      { name: "description", content: "ملفك الشخصي والإحصائيات والشهادات" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, logout } = useSession();

  const { data: userStats, isLoading: statsLoading } = useQuery({
    enabled: !!user?.id,
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      const [
        { data: enrollments, error: enrollmentsError },
        { data: certificates, error: certificatesError },
      ] = await Promise.all([
        supabase.from("enrollments").select("progress,completed_at").eq("user_id", user.id),
        supabase.from("certificates").select("id").eq("user_id", user.id),
      ]);
      if (enrollmentsError) throw enrollmentsError;
      if (certificatesError) throw certificatesError;
      return {
        total_courses: enrollments?.length ?? 0,
        completed_courses: enrollments?.filter((item) => !!item.completed_at).length ?? 0,
        total_hours: 0,
        total_certificates: certificates?.length ?? 0,
      };
    },
  });

  // Fetch certificates
  const { data: certificates, isLoading: certificatesLoading } = useQuery({
    enabled: !!user?.id,
    queryKey: ["certificates", user?.id],
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

  const { data: records, isLoading: recordsLoading } = useQuery({
    enabled: !!user?.id,
    queryKey: ["records", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      const { data, error } = await supabase
        .from("enrollments")
        .select("id,progress,completed_at,created_at,course:courses(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((record) => ({
        ...record,
        course_title: (record.course as { title?: string } | null)?.title ?? "دورة",
        status: record.completed_at ? "completed" : "in_progress",
        time_spent: 0,
      }));
    },
  });

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h2 className="text-xl font-bold">يرجى تسجيل الدخول</h2>
          <p className="mt-2 text-sm text-muted-foreground">لعرض ملفك الشخصي</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Profile Header */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{user.full_name || user.email}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="rounded-full bg-gold/10 p-3">
            <Award className="h-6 w-6 text-gold" />
          </div>
        </div>

        {/* Stats Grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : userStats ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background p-3 text-center">
              <p className="text-2xl font-bold text-gold">{userStats.total_courses || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">دورات</p>
            </div>
            <div className="rounded-lg bg-background p-3 text-center">
              <p className="text-2xl font-bold text-gold">{userStats.completed_courses || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">مكتملة</p>
            </div>
            <div className="rounded-lg bg-background p-3 text-center">
              <p className="text-2xl font-bold text-gold">{userStats.total_hours || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">ساعات</p>
            </div>
            <div className="rounded-lg bg-background p-3 text-center">
              <p className="text-2xl font-bold text-gold">{userStats.total_certificates || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">شهادات</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="certificates" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-lg bg-card">
          <TabsTrigger value="certificates">
            <Award className="h-4 w-4" />
            <span className="ml-2">الشهادات</span>
          </TabsTrigger>
          <TabsTrigger value="records">السجلات</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-3 mt-4">
          {certificatesLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : certificates && certificates.length > 0 ? (
            <div className="space-y-3">
              {certificates.map((cert) => (
                <CertificateCard
                  key={cert.id}
                  title="شهادة إتمام"
                  courseName={(cert.course as { title?: string } | null)?.title ?? "دورة"}
                  userName={user.full_name || user.email}
                  issueDate={new Date(cert.issued_at).toLocaleDateString("ar-SA")}
                  certificateId={cert.code}
                  onDownload={() =>
                    window.open(`/certificates/${cert.code}`, "_blank", "noopener,noreferrer")
                  }
                  onShare={() =>
                    void navigator.clipboard.writeText(
                      `${window.location.origin}/certificates/${cert.code}`,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <Award className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">لا توجد شهادات بعد</p>
            </div>
          )}
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-3 mt-4">
          {recordsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : records && records.length > 0 ? (
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div
                    className={`rounded-full p-2 ${
                      record.status === "completed" ? "bg-green-500/10" : "bg-gold/10"
                    }`}
                  >
                    <CheckCircle2
                      className={`h-4 w-4 ${
                        record.status === "completed" ? "text-green-600" : "text-gold"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{record.course_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.progress}% تقدم • {record.completed_at ? "مكتملة" : "قيد التعلّم"}
                    </p>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">لا توجد سجلات بعد</p>
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-3 mt-4">
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">الاسم الكامل</label>
              <p className="mt-1 text-sm font-semibold">{user.full_name || "لم يتم تعيين"}</p>
            </div>
            <div className="border-t border-border pt-3">
              <label className="text-xs font-semibold text-muted-foreground">
                البريد الإلكتروني
              </label>
              <p className="mt-1 text-sm font-semibold">{user.email}</p>
            </div>
            <div className="border-t border-border pt-3">
              <label className="text-xs font-semibold text-muted-foreground">نوع الحساب</label>
              <p className="mt-1 text-sm font-semibold capitalize">
                {["owner", "instructor", "moderator"].includes(user.role) ? "مشرف" : "متدرب"}
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="w-full rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/20"
          >
            تسجيل الخروج
          </button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
