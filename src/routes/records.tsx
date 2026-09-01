import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "السجلات — تدريب" },
      { name: "description", content: "سجل إنجازاتك والتفاعلات والشهادات" },
    ],
  }),
  component: RecordsPage,
});

function RecordsPage() {
  const { user } = useSession();

  const userId = user?.id;

  // The database stores course progress in enrollments.
  const { data: completionRecords, isLoading: completionLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["enrollments", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("id,progress,completed_at,created_at,course:courses(title)")
        .eq("user_id", userId)
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

  const { data: badges, isLoading: badgesLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["badges", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_badges")
        .select("id,earned_at,badge:badges(name,description,icon)")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: interactions, isLoading: interactionsLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["activity", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("activity_log")
        .select("id,action,meta,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h2 className="text-xl font-bold">يرجى تسجيل الدخول</h2>
          <p className="mt-2 text-sm text-muted-foreground">لعرض سجلاتك</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">سجلاتك</h1>
        <p className="mt-1 text-sm text-muted-foreground">تتبع إنجازاتك والتفاعلات والشهادات</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        {completionLoading ? (
          <>
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <CheckCircle2 className="mx-auto h-6 w-6 text-green-600" />
              <p className="mt-2 text-2xl font-bold">
                {completionRecords?.filter((r) => r.status === "completed").length || 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">دورات مكتملة</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <Zap className="mx-auto h-6 w-6 text-gold" />
              <p className="mt-2 text-2xl font-bold">
                {completionRecords?.reduce((sum, r) => sum + (r.progress || 0), 0) || 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">دقائق تعلم</p>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="completions" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-lg bg-card">
          <TabsTrigger value="completions">الإنجازات</TabsTrigger>
          <TabsTrigger value="badges">
            <Trophy className="h-4 w-4" />
            <span className="ml-2">الباجات</span>
          </TabsTrigger>
          <TabsTrigger value="activity">النشاط</TabsTrigger>
        </TabsList>

        {/* Completions Tab */}
        <TabsContent value="completions" className="space-y-3 mt-4">
          {completionLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : completionRecords && completionRecords.length > 0 ? (
            <div className="space-y-2">
              {completionRecords.map((record) => (
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
                      className={`h-5 w-5 ${
                        record.status === "completed" ? "text-green-600" : "text-gold"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{record.course_title}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full gold-gradient transition-all"
                        style={{ width: `${record.progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {record.progress}% • {record.progress}% تقدم
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">لا توجد إنجازات بعد</p>
            </div>
          )}
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="mt-4">
          {badgesLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : badges && badges.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center gap-2 rounded-lg border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-4 text-center"
                >
                  <Trophy className="h-6 w-6 text-gold" />
                  <p className="text-sm font-semibold">
                    {(badge.badge as { name?: string } | null)?.name ?? "بادج"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(badge.badge as { description?: string } | null)?.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">لم تحصل على أي باجات بعد</p>
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-2 mt-4">
          {interactionsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : interactions && interactions.length > 0 ? (
            <div className="space-y-2">
              {interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="flex gap-2 rounded-lg border border-border bg-card p-3"
                >
                  <Zap className="h-4 w-4 shrink-0 text-gold mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize">{interaction.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(interaction.created_at).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center">
              <Zap className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">لا توجد أنشطة بعد</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
