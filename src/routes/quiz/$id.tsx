import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, CheckCircle2, Clock, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { gradeEssayAnswer } from "@/lib/ai.functions";

export const Route = createFileRoute("/quiz/$id")({
  head: () => ({
    meta: [
      { title: "اختبار الدورة — تدريب" },
      { name: "description", content: "أدِّ اختبار الدورة واحصل على نتيجتك فوراً بتصحيح آلي وذكاء اصطناعي." },
      { property: "og:title", content: "اختبار الدورة — تدريب" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuizPage,
});

type Question = {
  id: string;
  type: "mcq" | "true_false" | "short" | "essay";
  prompt: string;
  options: string[] | null;
  correct_answer: string | null;
  ai_grade_context: string | null;
  explanation: string | null;
  points: number;
  position: number;
};

type AnswerResult = {
  question_id: string;
  answer: string;
  is_correct: boolean | null;
  awarded_points: number;
  ai_feedback?: string;
};

function QuizPage() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    score: number;
    max: number;
    passed: boolean;
    answerResults: AnswerResult[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiGrading, setAiGrading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      const { data: quiz, error } = await supabase
        .from("quizzes")
        .select("id,title,description,pass_score,time_limit_minutes,course_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      const { data: questions, error: questionsError } = (await supabase
        .from("quiz_questions_view" as any)
        .select("id,type,prompt,options,correct_answer,ai_grade_context,explanation,points,position")
        .eq("quiz_id", id)
        .order("position")) as { data: Question[] | null; error: any };
      if (questionsError) throw questionsError;
      return { quiz, questions: questions ?? [] };
    },
  });

  // مؤقت الاختبار
  useEffect(() => {
    if (!data?.quiz?.time_limit_minutes || result) return;
    const seconds = data.quiz.time_limit_minutes * 60;
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          toast.warning("انتهى وقت الاختبار! سيتم إرسال إجاباتك تلقائياً.");
          void submit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.quiz?.time_limit_minutes, result]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function submit(autoSubmit = false) {
    if (!user) { toast.error("سجّل الدخول أولاً"); return; }
    if (!data?.quiz || data.questions.length === 0) { toast.error("لا توجد أسئلة في هذا الاختبار"); return; }
    if (!autoSubmit && Object.keys(answers).length === 0) {
      toast.error("أجب على سؤال واحد على الأقل قبل الإرسال");
      return;
    }
    setSaving(true);
    try {
      let score = 0;
      const maxScore = data.questions.reduce((s, q) => s + q.points, 0);

      // المرحلة 1: تصحيح MCQ وصح/خطأ فورياً
      const answerRows: AnswerResult[] = data.questions.map((q) => {
        const userAnswer = answers[q.id] ?? "";
        let isCorrect: boolean | null = null;
        let awarded = 0;

        if ((q.type === "mcq" || q.type === "true_false") && q.correct_answer) {
          isCorrect = userAnswer.trim() === q.correct_answer.trim();
          awarded = isCorrect ? q.points : 0;
          score += awarded;
        }
        return { question_id: q.id, answer: userAnswer, is_correct: isCorrect, awarded_points: awarded };
      });

      // المرحلة 2: تصحيح الإجابات المقالية والقصيرة بالذكاء الاصطناعي
      const essayQuestions = data.questions.filter(
        (q) => q.type === "short" || q.type === "essay",
      );
      if (essayQuestions.length > 0) {
        setSaving(false);
        setAiGrading(true);
        try {
          await Promise.all(
            essayQuestions.map(async (q) => {
              const userAnswer = answers[q.id] ?? "";
              if (!userAnswer.trim()) return;
              const idx = answerRows.findIndex((r) => r.question_id === q.id);
              if (idx === -1) return;

              if (!q.correct_answer) {
                // لا توجد إجابة نموذجية — يحتاج مراجعة يدوية
                answerRows[idx].is_correct = null;
                answerRows[idx].ai_feedback = "تحتاج مراجعة يدوية من المدرّب.";
                return;
              }

              try {
                const gradeResult = await gradeEssayAnswer({
                  data: {
                    question: q.prompt,
                    correctAnswer: q.correct_answer,
                    studentAnswer: userAnswer,
                    maxPoints: q.points,
                    extraContext: q.ai_grade_context ?? "",
                  },
                });
                if (gradeResult.ok) {
                  const awarded = gradeResult.score;
                  score += awarded;
                  answerRows[idx].awarded_points = awarded;
                  answerRows[idx].is_correct = awarded >= q.points * 0.6;
                  answerRows[idx].ai_feedback = gradeResult.feedback;
                } else {
                  answerRows[idx].ai_feedback = `لم يتمكن الذكاء الاصطناعي من التصحيح: ${gradeResult.message}`;
                }
              } catch {
                answerRows[idx].ai_feedback = "خطأ أثناء التصحيح الذكي.";
              }
            }),
          );
        } finally {
          setAiGrading(false);
          setSaving(true);
        }
      }

      const passed = maxScore > 0 && (score / maxScore) * 100 >= data.quiz.pass_score;

      const { data: attempt, error } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: data.quiz.id,
          course_id: data.quiz.course_id,
          user_id: user.id,
          score,
          max_score: maxScore,
          passed,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;

      const rows = answerRows.map((r) => ({
        attempt_id: attempt.id,
        user_id: user.id,
        question_id: r.question_id,
        answer: r.answer,
        is_correct: r.is_correct,
        awarded_points: r.awarded_points,
        ai_feedback: r.ai_feedback ?? null,
      }));
      if (rows.length) {
        const { error: aErr } = await supabase.from("attempt_answers").insert(rows as any);
        if (aErr) console.warn("attempt_answers insert:", aErr.message);
      }

      setResult({ score, max: maxScore, passed, answerResults: answerRows });
      if (passed) toast.success("مبروك! لقد اجتزت الاختبار 🎉");
      else toast.info(`حصلت على ${score} من ${maxScore}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال الإجابات");
    } finally {
      setSaving(false);
      setAiGrading(false);
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
        <Link to="/" className="text-sm font-semibold text-gold">العودة للرئيسية</Link>
      </div>
    );

  if (!user)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm font-semibold">يجب تسجيل الدخول لبدء الاختبار</p>
        <Link to="/auth" className="rounded-full gold-gradient px-5 py-2 text-sm text-gold-foreground">
          تسجيل الدخول
        </Link>
      </div>
    );

  const hasEssay = data.questions.some((q) => q.type === "short" || q.type === "essay");

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-28">
      {/* رأس الاختبار */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{data.quiz.title}</h1>
            {data.quiz.description && (
              <p className="mt-1 text-sm text-muted-foreground">{data.quiz.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">نسبة النجاح {data.quiz.pass_score}%</Badge>
              {data.quiz.time_limit_minutes && (
                <Badge variant="outline">
                  <Clock className="me-1 h-3 w-3" />
                  {data.quiz.time_limit_minutes} دقيقة
                </Badge>
              )}
              <Badge variant="outline">{data.questions.length} سؤال</Badge>
              {hasEssay && (
                <Badge className="gold-gradient text-gold-foreground">
                  <Sparkles className="me-1 h-3 w-3" />
                  تصحيح ذكي
                </Badge>
              )}
            </div>
          </div>
          {timeLeft !== null && !result && (
            <div
              className={`rounded-lg border p-2 text-center tabular-nums ${
                timeLeft < 60 ? "border-destructive text-destructive" : "border-border text-foreground"
              }`}
            >
              <Clock className="mx-auto h-4 w-4" />
              <p className="text-lg font-bold">{formatTime(timeLeft)}</p>
            </div>
          )}
        </div>
      </div>

      {/* نتيجة الاختبار */}
      {result ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-gold/40 bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-gold" />
            <p className="mt-3 text-lg font-bold">
              نتيجتك: {result.score} / {result.max}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.passed ? "مبروك، لقد اجتزت الاختبار. ✅" : "لم تجتز الاختبار هذه المرة. حاول مجدداً."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              النسبة: {result.max > 0 ? Math.round((result.score / result.max) * 100) : 0}%
            </p>
          </div>

          {/* تفصيل النتائج */}
          {data.questions.map((q, i) => {
            const ar = result.answerResults.find((r) => r.question_id === q.id);
            if (!ar) return null;
            const isCorrect = ar.is_correct;
            const hasAiFeedback = !!ar.ai_feedback;
            return (
              <div
                key={q.id}
                className={`rounded-xl border p-4 text-right ${
                  isCorrect === true
                    ? "border-green-500/40 bg-green-500/5"
                    : isCorrect === false
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border bg-card"
                }`}
              >
                <p className="text-sm font-semibold">
                  {i + 1}. {q.prompt}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  إجابتك: {ar.answer || "(لم تجب)"}
                </p>
                {q.correct_answer && (
                  <p className="mt-0.5 text-xs text-green-700 dark:text-green-400">
                    الإجابة الصحيحة: {q.correct_answer}
                  </p>
                )}
                {q.explanation && (
                  <p className="mt-1 text-xs text-muted-foreground">💡 {q.explanation}</p>
                )}
                {hasAiFeedback && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-gold/10 p-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <p className="text-xs text-foreground">{ar.ai_feedback}</p>
                  </div>
                )}
                <p className="mt-1 text-xs font-semibold">
                  الدرجة: {ar.awarded_points}/{q.points}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* أسئلة الاختبار */}
          {data.questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {i + 1}. {q.prompt}
                </p>
                <span className="ms-2 shrink-0 text-xs text-muted-foreground">{q.points} نقطة</span>
              </div>
              {q.type === "mcq" || q.type === "true_false" ? (
                <div className="mt-3 space-y-2">
                  {((q.options as string[]) ?? []).map((opt) => (
                    <label
                      key={opt}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
                        answers[q.id] === opt
                          ? "border-gold bg-gold/10"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className="accent-gold"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-3">
                  {(q.type === "essay" || q.type === "short") && (
                    <p className="mb-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-gold" />
                      ستُصحَّح هذه الإجابة بالذكاء الاصطناعي بالمقارنة مع الإجابة النموذجية
                    </p>
                  )}
                  <Textarea
                    rows={q.type === "essay" ? 5 : 3}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="اكتب إجابتك هنا..."
                    className="resize-y"
                  />
                </div>
              )}
            </div>
          ))}

          <Button
            onClick={() => submit(false)}
            disabled={saving || aiGrading}
            className="w-full gold-gradient text-gold-foreground"
          >
            {aiGrading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                جارٍ التصحيح بالذكاء الاصطناعي...
              </>
            ) : saving ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                جارٍ الإرسال...
              </>
            ) : (
              "إرسال الإجابات"
            )}
          </Button>
        </>
      )}
    </div>
  );
}
