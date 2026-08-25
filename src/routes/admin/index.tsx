import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, HelpCircle, BarChart3, Settings, LayoutDashboard, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "لوحة التحكم — مِرقاة" }] }),
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useSession();

  const { data: role } = useQuery({
    enabled: !!user,
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
      return data?.role ?? "student";
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [courses, users, enrollments, quizzes] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("quizzes").select("id", { count: "exact", head: true }),
      ]);
      return { courses: courses.count ?? 0, users: users.count ?? 0, enrollments: enrollments.count ?? 0, quizzes: quizzes.count ?? 0 };
    },
  });

  if (role && role === "student") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-muted-foreground">ليس لديك صلاحية للوصول لهذه الصفحة.</p>
        <Link to="/" className="rounded-full gold-gradient px-5 py-2 text-sm font-medium text-gold-foreground">العودة للرئيسية</Link>
      </div>
    );
  }

  const menu = [
    { to: "/admin/courses", label: "الدورات", icon: BookOpen, desc: "إنشاء وتحرير الدورات والدروس" },
    { to: "/admin/quizzes", label: "الاختبارات", icon: HelpCircle, desc: "إنشاء وتصحيح الاختبارات" },
    { to: "/admin/users", label: "المستخدمون", icon: Users, desc: "إدارة المستخدمين والأدوار" },
    { to: "/admin/analytics", label: "التحليلات", icon: BarChart3, desc: "إحصائيات وتقارير" },
    { to: "/admin/settings", label: "الإعدادات", icon: Settings, desc: "إعدادات المنصة والإعلانات" },
  ];

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-1 flex items-center gap-2 text-lg font-bold"><LayoutDashboard className="h-5 w-5 text-gold" /> لوحة التحكم</h1>
      <p className="mb-5 text-xs text-muted-foreground">إدارة المنصة والمحتوى</p>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatCard label="الدورات" value={stats?.courses ?? 0} icon={BookOpen} />
        <StatCard label="المستخدمون" value={stats?.users ?? 0} icon={Users} />
        <StatCard label="التسجيلات" value={stats?.enrollments ?? 0} icon={Plus} />
        <StatCard label="الاختبارات" value={stats?.quizzes ?? 0} icon={HelpCircle} />
      </div>

      <div className="space-y-2">
        {menu.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="border-border mb-2 transition-transform active:scale-[0.99]">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><item.icon className="h-5 w-5 text-gold" /></div>
                <div className="flex-1"><p className="text-sm font-semibold">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.desc}</p></div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <Card className="border-border">
      <CardContent className="flex items-center gap-2 p-3">
        <Icon className="h-5 w-5 text-gold" />
        <div><p className="text-lg font-bold">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>
      </CardContent>
    </Card>
  );
}
