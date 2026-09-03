import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/quiz/$id")({
  head: () => ({
    meta: [
      { title: "اختبار الدورة — تدريب" },
      { name: "description", content: "أدِّ اختبار الدورة واحصل على نتيجتك فوراً بتصحيح آلي." },
      { property: "og:title", content: "اختبار الدورة — تدريب" },
      { property: "og:description", content: "اختبار تفاعلي مع تصحيح فوري على الخادم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; max: number; passed: boolean } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      const { data: quiz, error } = await supabase
        .from("quizzes")
        .select("id,title,description,pass_score,time_limit_minutes,course_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      const { data: questions } = await supabase
        .from("questions")
        .select("id,type,prompt,options,points,position")
        .eq("quiz_id", id)
        .order("position");
      return { quiz, questions: questions ?? [] };
    },
  });

  async function submit() {
    if (!user) {
      toast.error("سجّل الدخول أولاً");
      return;
    }
    if (!data?.quiz) return;
    setSaving(true);
    try {
      const { data: attempt, error } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: data.quiz.id,
          course_id: data.quiz.course_id,
          user_id: user.id,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;

      const rows = data.questions.map((q) => ({
        attempt_id: attempt.id,
        question_id: q.id,
        user_id: user.id,
        answer: answers[q.id] ?? "",
      }));
      if (rows.length) {
        const { error: aErr } = await supabase.from("attempt_answers").insert(rows);
        if (aErr) throw aErr;
      }

      const { data: graded } = await supabase
        .from("quiz_attempts")
        .select("score,max_score,passed")
        .eq("id", attempt.id)
        .maybeSingle();

      setResult({
        score: Number(graded?.score ?? 0),
        max: Number(graded?.max_score ?? 0),
        passed: Boolean(graded?.passed),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال الإجابات");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading)
    return (
      <div className="space-y-3 p-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );

  if (!data?.quiz)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <HelpCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">هذا الاختبار غير متاح.</p>
        <Link to="/" className="text-sm font-semibold text-gold">
          العودة للرئيسية
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-28">
      <div>
        <h1 className="text-xl font-bold">{data.quiz.title}</h1>
        {data.quiz.description && (
          <p className="mt-1 text-sm text-muted-foreground">{data.quiz.description}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          نسبة النجاح {data.quiz.pass_score}%
          {data.quiz.time_limit_minutes ? ` • ${data.quiz.time_limit_minutes} دقيقة` : ""}
        </p>
      </div>

      {result ? (
        <div className="rounded-2xl border border-gold/40 bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-gold" />
          <p className="mt-3 text-lg font-bold">
            نتيجتك: {result.score} / {result.max}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.passed ? "مبروك، لقد اجتزت الاختبار." : "لم تجتز الاختبار هذه المرة."}
          </p>
        </div>
      ) : (
        <>
          {data.questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">
                {i + 1}. {q.prompt}
              </p>
              {q.type === "mcq" || q.type === "true_false" ? (
                <div className="mt-3 space-y-2">
                  {((q.options as string[]) ?? []).map((opt) => (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <Textarea
                  className="mt-3"
                  rows={3}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="اكتب إجابتك..."
                />
              )}
            </div>
          ))}

          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? "جارٍ الإرسال..." : "إرسال الإجابات"}
          </Button>
        </>
      )}
    </div>
  );
}
