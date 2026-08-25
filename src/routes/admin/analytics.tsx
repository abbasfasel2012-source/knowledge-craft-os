import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, BookOpen, Award, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "التحليلات — مِرقاة" }] }),
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const { data: stats } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [courses, users, enrollments, certificates, quizzes, reviews] = await Promise.all([
        supabase.from("courses").select("id,title,status"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id,progress,completed_at,course:courses(title)"),
        supabase.from("certificates").select("id", { count: "exact", head: true }),
        supabase.from("quiz_attempts").select("id,score,max_score,passed"),
        supabase.from("reviews").select("id,rating"),
      ]);

      const courseEnrollments = new Map<string, number>();
      enrollments.data?.forEach((e) => { const c = e.course as { title: string } | null; if (c) courseEnrollments.set(c.title, (courseEnrollments.get(c.title) ?? 0) + 1); });
      const chartData = Array.from(courseEnrollments.entries()).map(([name, value]) => ({ name, value })).slice(0, 8);

      const avgQuizScore = quizzes.data && quizzes.data.length > 0 ? Math.round(quizzes.data.reduce((s, q) => s + (q.max_score > 0 ? (q.score / q.max_score) * 100 : 0), 0) / quizzes.data.length) : 0;
      const avgRating = reviews.data && reviews.data.length > 0 ? (reviews.data.reduce((s, r) => s + r.rating, 0) / reviews.data.length).toFixed(1) : "—";

      const statusData = [
        { name: "منشور", value: courses.data?.filter((c) => c.status === "published").length ?? 0, color: "oklch(0.75 0.125 85)" },
        { name: "مسودة", value: courses.data?.filter((c) => c.status === "draft").length ?? 0, color: "oklch(0.52 0.018 75)" },
        { name: "مؤرشف", value: courses.data?.filter((c) => c.status === "archived").length ?? 0, color: "oklch(0.3 0.02 70)" },
      ];

      return { totalCourses: courses.data?.length ?? 0, totalUsers: users.count ?? 0, totalEnrollments: enrollments.data?.length ?? 0, totalCertificates: certificates.count ?? 0, avgQuizScore, avgRating, chartData, statusData };
    },
  });

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-lg font-bold">التحليلات</h1>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatCard icon={BookOpen} label="الدورات" value={stats?.totalCourses ?? 0} />
        <StatCard icon={Users} label="المستخدمون" value={stats?.totalUsers ?? 0} />
        <StatCard icon={TrendingUp} label="التسجيلات" value={stats?.totalEnrollments ?? 0} />
        <StatCard icon={Award} label="الشهادات" value={stats?.totalCertificates ?? 0} />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Card className="border-border"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-gold">{stats?.avgQuizScore ?? 0}%</p><p className="text-[10px] text-muted-foreground">متوسط درجات الاختبارات</p></CardContent></Card>
        <Card className="border-border"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-gold">{stats?.avgRating ?? "—"}</p><p className="text-[10px] text-muted-foreground">متوسط التقييمات</p></CardContent></Card>
      </div>

      {stats && stats.chartData.length > 0 && (
        <Card className="mb-4 border-border">
          <CardHeader><CardTitle className="text-sm">التسجيلات حسب الدورة</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill="oklch(0.75 0.125 85)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {stats && stats.statusData.some((s) => s.value > 0) && (
        <Card className="border-border">
          <CardHeader><CardTitle className="text-sm">حالة الدورات</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}>{stats.statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie>
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <Card className="border-border"><CardContent className="flex items-center gap-2 p-3"><Icon className="h-5 w-5 text-gold" /><div><p className="text-lg font-bold">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div></CardContent></Card>;
}
