import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Clock, Star, Sparkles, BookOpen, Database } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_CATEGORIES, DEMO_COURSES } from "@/lib/demo-data";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مِرقاة — منصة التدريب العربية" },
      {
        name: "description",
        content: "تعلّم من دورات مصوّرة مع مرفقات ومساعد ذكي وشهادات إتمام — بواجهة عربية سلسة.",
      },
      { property: "og:title", content: "مِرقاة — منصة التدريب العربية" },
      {
        property: "og:description",
        content: "دورات مصوّرة، مرفقات، مساعد ذكي، شهادات وباجات — كل شيء في تطبيق واحد.",
      },
    ],
  }),
  component: Home,
});

const LEVELS: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

function Home() {
  const [q, setQ] = useState("");
  const { user } = useSession();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return DEMO_CATEGORIES;
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id,name,slug")
          .order("name");
        if (error || !data?.length) return DEMO_CATEGORIES;
        return data;
      } catch {
        return DEMO_CATEGORIES;
      }
    },
  });

  const [cat, setCat] = useState<string | null>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", cat, q],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        let list = DEMO_COURSES;
        if (cat) list = list.filter((c) => c.category_id === cat);
        if (q.trim()) {
          const search = q.trim().toLowerCase();
          list = list.filter(
            (c) =>
              c.title.toLowerCase().includes(search) || c.summary.toLowerCase().includes(search),
          );
        }
        return list;
      }

      try {
        let query = supabase
          .from("courses")
          .select("id,title,slug,summary,cover_url,level,duration_minutes,is_free,price")
          .eq("status", "published")
          .order("created_at", { ascending: false });
        if (cat) query = query.eq("category_id", cat);
        if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
        const { data, error } = await query;
        if (error || !data?.length) {
          // fallback to demo courses if table is empty or error
          let list = DEMO_COURSES;
          if (cat) list = list.filter((c) => c.category_id === cat);
          if (q.trim()) {
            const search = q.trim().toLowerCase();
            list = list.filter(
              (c) =>
                c.title.toLowerCase().includes(search) || c.summary.toLowerCase().includes(search),
            );
          }
          return list;
        }
        return data;
      } catch {
        return DEMO_COURSES;
      }
    },
  });

  const { data: continueList } = useQuery({
    enabled: !!user,
    queryKey: ["continue", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("enrollments")
          .select("progress, course:courses(id,title,slug,cover_url)")
          .order("created_at", { ascending: false })
          .limit(5);
        if (error) return [];
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="شعار مِرقاة" className="h-11 w-11 rounded-2xl object-cover" />
          <div>
            <p className="text-xs text-muted-foreground">أهلاً بك في</p>
            <h1 className="text-lg font-bold">مِرقاة</h1>
          </div>
        </div>
        {!user && (
          <Link
            to="/auth"
            className="rounded-full gold-gradient px-4 py-2 text-sm font-semibold text-gold-foreground"
          >
            دخول
          </Link>
        )}
      </header>

      {!isSupabaseConfigured && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-gold/40 bg-accent/20 p-3.5 text-xs text-foreground">
          <Database className="h-5 w-5 shrink-0 text-gold" />
          <div className="flex-1">
            <p className="font-bold">وضع العرض التجريبي التفاعلي (مفعل محلياً)</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              الدورات والدروس والاختبارات تعمل الآن ببيانات تجريبية كاملة. لربط قاعدة بيانات
              Supabase سحابية حية، أضف مفاتيح Supabase في ملف الإعدادات البيئية.
            </p>
          </div>
        </div>
      )}

      <div className="relative mb-5">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن دورة..."
          className="h-12 rounded-2xl bg-card pr-10 text-sm"
        />
      </div>

      {continueList && continueList.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold">أكمل تعلّمك</h2>
          <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {continueList.map((row, i) => {
              const c = Array.isArray(row.course) ? row.course[0] : row.course;
              if (!c) return null;
              return (
                <Link
                  key={i}
                  to="/course/$slug"
                  params={{ slug: c.slug }}
                  className="w-44 shrink-0 rounded-2xl border border-border bg-card p-3"
                >
                  <div className="mb-2 h-20 overflow-hidden rounded-xl bg-muted">
                    {c.cover_url && (
                      <img src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <p className="line-clamp-1 text-xs font-semibold">{c.title}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full gold-gradient" style={{ width: `${row.progress}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {categories && categories.length > 0 && (
        <div className="scrollbar-hide -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={cat === null} onClick={() => setCat(null)} label="الكل" />
          {categories.map((c) => (
            <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} label={c.name} />
          ))}
        </div>
      )}

      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Sparkles className="h-4 w-4 text-gold" /> الدورات المتاحة
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : !courses?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          لا توجد دورات منشورة بعد.
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <Link
              key={c.id}
              to="/course/$slug"
              params={{ slug: c.slug }}
              className="flex gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-soft)] transition-transform active:scale-[0.99]"
            >
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                {c.cover_url ? (
                  <img
                    src={c.cover_url}
                    alt={c.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-7 w-7 text-muted-foreground/60" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-1 text-sm font-bold">{c.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.summary}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {c.duration_minutes} د
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-gold" /> {LEVELS[c.level] ?? c.level}
                  </span>
                  <span className="mr-auto rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-foreground">
                    {c.is_free ? "مجاني" : `${c.price} $`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors " +
        (active
          ? "gold-gradient border-transparent text-gold-foreground"
          : "border-border bg-card text-muted-foreground")
      }
    >
      {label}
    </button>
  );
}
