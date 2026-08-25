import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit, Trash2, Eye, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — مِرقاة" },
      { name: "description", content: "لوحة تحكم المشرفين وإدارة الدورات" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    enabled: user?.role === "admin",
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data: coursesCount } = await supabase
        .from("courses")
        .select("*", { count: "exact" });
      const { data: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact" });
      const { data: enrollmentsCount } = await supabase
        .from("enrollments")
        .select("*", { count: "exact" });
      const { data: certificatesCount } = await supabase
        .from("certificates")
        .select("*", { count: "exact" });

      return {
        courses: coursesCount?.length || 0,
        users: usersCount?.length || 0,
        enrollments: enrollmentsCount?.length || 0,
        certificates: certificatesCount?.length || 0,
      };
    },
  });

  // Fetch all courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    enabled: user?.role === "admin",
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery({
    enabled: user?.role === "admin",
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h2 className="text-xl font-bold">لا توجد صلاحيات</h2>
          <p className="mt-2 text-sm text-muted-foreground">هذه الصفحة متاحة للمشرفين فقط.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-muted-foreground">إدارة الدورات والمستخدمين والإحصائيات</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        {statsLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </>
        ) : stats ? (
          <>
            <StatCard
              icon={<TrendingUp className="h-6 w-6" />}
              label="الدورات"
              value={stats.courses}
            />
            <StatCard
              icon={<Users className="h-6 w-6" />}
              label="المستخدمون"
              value={stats.users}
            />
            <StatCard
              icon={<Eye className="h-6 w-6" />}
              label="التسجيلات"
              value={stats.enrollments}
            />
            <StatCard
              icon={<TrendingUp className="h-6 w-6" />}
              label="الشهادات"
              value={stats.certificates}
            />
          </>
        ) : null}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-lg bg-card">
          <TabsTrigger value="courses">الدورات</TabsTrigger>
          <TabsTrigger value="users">المستخدمون</TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-3 mt-4">
          <button className="w-full flex items-center justify-center gap-2 rounded-lg gold-gradient px-4 py-3 text-sm font-semibold text-gold-foreground">
            <Plus className="h-4 w-4" />
            إضافة دورة جديدة
          </button>

          {coursesLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="space-y-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {course.cover_url && (
                      <img
                        src={course.cover_url}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">{course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {course.students_count} طالب • {course.duration_minutes} د
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button className="rounded-lg border border-border bg-card p-2 hover:bg-muted transition-colors">
                      <Edit className="h-4 w-4 text-gold" />
                    </button>
                    <button className="rounded-lg border border-border bg-card p-2 hover:bg-muted transition-colors">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">لا توجد دورا�� بعد</p>
            </div>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-3 mt-4">
          {usersLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gold/10">
                    {u.avatar_url && (
                      <img
                        src={u.avatar_url}
                        alt={u.full_name || u.email}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">{u.full_name || u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                    u.role === 'admin'
                      ? 'bg-gold/10 text-gold'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {u.role === 'admin' ? 'مشرف' : 'مستخدم'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">لا توجد مستخدمون بعد</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gold">{value}</p>
        </div>
        <div className="rounded-lg gold-gradient p-2 text-gold-foreground">
          {icon}
        </div>
      </div>
    </div>
  );
}
