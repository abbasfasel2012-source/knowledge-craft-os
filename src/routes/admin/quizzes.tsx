import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, X, Trash2, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/admin/quizzes")({
  head: () => ({ meta: [{ title: "إدارة الاختبارات — تدريب" }] }),
  component: AdminQuizzes,
});

function AdminQuizzes() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);

  const { data: quizzes } = useQuery({
    queryKey: ["admin-quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id,title,is_active,pass_score,max_attempts,course:courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="px-4 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">إدارة الاختبارات</h1>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingQuiz(null);
          }}
          size="sm"
          className="gold-gradient text-gold-foreground"
        >
          <Plus className="h-4 w-4" /> اختبار جديد
        </Button>
      </div>

      {showForm && (
        <QuizForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
          }}
        />
      )}
      {editingQuiz && <QuestionsEditor quizId={editingQuiz} onClose={() => setEditingQuiz(null)} />}

      <div className="space-y-2">
        {quizzes?.map((q) => {
          const c = q.course as unknown as { title: string } | null;
          return (
            <Card key={q.id} className="border-border">
              <CardContent className="flex items-center gap-3 p-3">
                <HelpCircle
                  className={
                    "h-5 w-5 " + (q.is_active ? "text-green-600" : "text-muted-foreground")
                  }
                />
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold">{q.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {c?.title ?? ""} • نجاح: {q.pass_score}%
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditingQuiz(q.id)}>
                  أسئلة
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {(!quizzes || quizzes.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد اختبارات.</p>
        )}
      </div>
    </div>
  );
}

function QuizForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [passScore, setPassScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [timeLimit, setTimeLimit] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id,title").order("title");
      if (error) throw error;
      return data;
    },
  });

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("quizzes").insert({
      title,
      description,
      course_id: courseId,
      pass_score: passScore,
      max_attempts: maxAttempts,
      time_limit_minutes: timeLimit,
      shuffle,
      show_answers: showAnswers,
      is_active: isActive,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إنشاء الاختبار");
    onSaved();
  }

  return (
    <Card className="mb-4 border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          اختبار جديد <X className="h-4 w-4 cursor-pointer" onClick={onClose} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>العنوان</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>الوصف</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label>الدورة</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="اختر دورة" />
            </SelectTrigger>
            <SelectContent>
              {courses?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label>درجة النجاح %</Label>
            <Input
              type="number"
              value={passScore}
              onChange={(e) => setPassScore(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>المحاولات</Label>
            <Input
              type="number"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>الوقت (د)</Label>
            <Input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={shuffle} onCheckedChange={setShuffle} />
            <Label>خلط الأسئلة</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showAnswers} onCheckedChange={setShowAnswers} />
            <Label>إظهار الإجابات</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>مفعّل</Label>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !title.trim() || !courseId}
          className="w-full gold-gradient text-gold-foreground"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </CardContent>
    </Card>
  );
}

function QuestionsEditor({ quizId, onClose }: { quizId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("mcq");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [points, setPoints] = useState(1);
  const [saving, setSaving] = useState(false);

  const { data: questions } = useQuery({
    queryKey: ["quiz-questions-admin", quizId],
    queryFn: async () => {
      // مفتاح الإجابة (correct_answer/explanation) لم يعد يُقرأ عبر الواجهة إطلاقاً — التصحيح يتم على الخادم.
      const { data, error } = await supabase
        .from("questions")
        .select("id, quiz_id, type, prompt, options, points, position")
        .eq("quiz_id", quizId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleAdd() {
    setSaving(true);
    const { data: existing } = await supabase
      .from("questions")
      .select("position")
      .eq("quiz_id", quizId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = (existing?.[0]?.position ?? -1) + 1;
    const opts =
      type === "mcq"
        ? options.filter((o) => o.trim())
        : type === "true_false"
          ? ["true", "false"]
          : [];
    const { error } = await supabase.from("questions").insert({
      quiz_id: quizId,
      type,
      prompt,
      options: opts,
      correct_answer: correctAnswer || null,
      explanation: explanation || null,
      points,
      position: nextPos,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إضافة السؤال");
    setPrompt("");
    setCorrectAnswer("");
    setExplanation("");
    setOptions(["", "", "", ""]);
    queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin"] });
  }

  async function handleDelete(qid: string) {
    const { error } = await supabase.from("questions").delete().eq("id", qid);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["quiz-questions-admin"] });
  }

  return (
    <Card className="mb-4 border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          أسئلة الاختبار <X className="h-4 w-4 cursor-pointer" onClick={onClose} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {questions?.map((q, i) => (
            <div key={q.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
              <span className="text-xs text-muted-foreground">{i + 1}.</span>
              <p className="flex-1 text-xs">{q.prompt}</p>
              <span className="text-[10px] text-muted-foreground">{q.type}</span>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
          {(!questions || questions.length === 0) && (
            <p className="text-center text-xs text-muted-foreground py-2">لا توجد أسئلة.</p>
          )}
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold">سؤال جديد</p>
          <div className="space-y-1.5">
            <Label>السؤال</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="اكتب السؤال"
              className="min-h-[60px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>النوع</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">اختيار متعدد</SelectItem>
                <SelectItem value="true_false">صح/خطأ</SelectItem>
                <SelectItem value="short">إجابة قصيرة</SelectItem>
                <SelectItem value="essay">مقالي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "mcq" && (
            <div className="space-y-1.5">
              <Label>الخيارات</Label>
              {options.map((opt, i) => (
                <Input
                  key={i}
                  value={opt}
                  onChange={(e) => {
                    const o = [...options];
                    o[i] = e.target.value;
                    setOptions(o);
                  }}
                  placeholder={`خيار ${i + 1}`}
                />
              ))}
            </div>
          )}
          {(type === "mcq" || type === "short" || type === "true_false") && (
            <div className="space-y-1.5">
              <Label>الإجابة الصحيحة</Label>
              {type === "true_false" ? (
                <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">صح</SelectItem>
                    <SelectItem value="false">خطأ</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="الإجابة الصحيحة"
                />
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>النقاط</Label>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>الشرح</Label>
              <Input
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="شرح اختياري"
              />
            </div>
          </div>
          <Button
            onClick={handleAdd}
            disabled={saving || !prompt.trim()}
            className="w-full gold-gradient text-gold-foreground"
            size="sm"
          >
            {saving ? "جارٍ الإضافة..." : "إضافة السؤال"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
