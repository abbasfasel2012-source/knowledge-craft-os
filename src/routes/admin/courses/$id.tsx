import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Plus,
  X,
  Upload,
  Play,
  FileText,
  HelpCircle,
  Link as LinkIcon,
  Headphones,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  FileImage,
  Archive,
  Wand2,
} from "lucide-react";
import { uploadMedia } from "@/lib/storage";
import { useSession } from "@/lib/session";
import { generateTranscript } from "@/lib/ai.functions";

export const Route = createFileRoute("/admin/courses/$id")({
  head: () => ({ meta: [{ title: "تحرير الدورة — تدريب" }] }),
  component: EditCourse,
});

function EditCourse() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: course } = useQuery({
    queryKey: ["admin-course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["admin-course-lessons", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", id)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("courses").update(updates as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث الدورة");
      queryClient.invalidateQueries({ queryKey: ["admin-course"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const lessonTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Play className="h-4 w-4" />;
      case "pdf": return <FileText className="h-4 w-4" />;
      case "quiz": return <HelpCircle className="h-4 w-4" />;
      case "link": return <LinkIcon className="h-4 w-4" />;
      case "audio": return <Headphones className="h-4 w-4" />;
      case "image": return <FileImage className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="px-4 pt-6">
      <Link to="/admin/courses" className="mb-3 text-xs text-muted-foreground hover:text-foreground">
        ← العودة للدورات
      </Link>
      <h1 className="mb-4 text-lg font-bold">تحرير: {course?.title}</h1>

      <Card className="mb-4 border-border">
        <CardHeader>
          <CardTitle className="text-sm">معلومات الدورة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>العنوان</Label>
            <Input
              defaultValue={course?.title}
              onBlur={(e) => updateMutation.mutate({ title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>الملخص</Label>
            <Input
              defaultValue={course?.summary}
              onBlur={(e) => updateMutation.mutate({ summary: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>الوصف</Label>
            <Textarea
              defaultValue={course?.description}
              onBlur={(e) => updateMutation.mutate({ description: e.target.value })}
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select defaultValue={course?.status} onValueChange={(v) => updateMutation.mutate({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="published">منشور</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              defaultChecked={course?.sequential}
              onCheckedChange={(v) => updateMutation.mutate({ sequential: v })}
            />
            <Label>تعلّم متسلسل</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              defaultChecked={course?.certificate_enabled}
              onCheckedChange={(v) => updateMutation.mutate({ certificate_enabled: v })}
            />
            <Label>تفعيل الشهادات</Label>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold">الدروس</h2>
          <Button
            onClick={() => setShowLessonForm(!showLessonForm)}
            size="sm"
            className="gold-gradient text-gold-foreground"
          >
            <Plus className="h-4 w-4" /> درس جديد
          </Button>
        </div>

        {showLessonForm && (
          <LessonForm
            courseId={id}
            onClose={() => setShowLessonForm(false)}
            onSaved={() => {
              setShowLessonForm(false);
              queryClient.invalidateQueries({ queryKey: ["admin-course-lessons"] });
            }}
          />
        )}

        <div className="space-y-2">
          {lessons?.map((lesson) =>
            editingId === lesson.id ? (
              <LessonForm
                key={lesson.id}
                courseId={id}
                lesson={lesson as unknown as LessonRow}
                onClose={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  queryClient.invalidateQueries({ queryKey: ["admin-course-lessons"] });
                }}
              />
            ) : (
              <Card key={lesson.id} className="border-border">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    {lessonTypeIcon(lesson.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{lesson.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {lesson.type} • {lesson.duration_minutes} د
                      {lesson.audio_url && " • 🎧"}
                      {lesson.script_text && " • 📝"}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="تعديل الدرس"
                    onClick={() => {
                      setShowLessonForm(false);
                      setEditingId(lesson.id);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="حذف الدرس"
                    onClick={async () => {
                      if (!window.confirm(`حذف الدرس "${lesson.title}"؟`)) return;
                      const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);
                      if (error) { toast.error(error.message); return; }
                      toast.success("تم حذف الدرس");
                      queryClient.invalidateQueries({ queryKey: ["admin-course-lessons"] });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ),
          )}
          {(!lessons || lessons.length === 0) && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              لا توجد دروس. أضف أول درس!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type LessonRow = {
  id: string;
  title: string;
  type: string;
  content: string | null;
  video_url: string | null;
  pdf_url: string | null;
  audio_url: string | null;
  attachment_url: string | null;
  script_text: string | null;
  ai_context: string | null;
  summary: string | null;
  duration_minutes: number;
  is_preview: boolean;
};

// أنواع المرفقات المدعومة
const ATTACHMENT_TYPES = [
  { value: "pdf", label: "PDF", accept: "application/pdf", icon: "📄" },
  { value: "image", label: "صورة", accept: "image/*", icon: "🖼️" },
  { value: "audio", label: "ملف صوتي", accept: "audio/*", icon: "🎵" },
  { value: "video", label: "فيديو", accept: "video/*", icon: "🎬" },
  { value: "archive", label: "ملف مضغوط", accept: ".zip,.rar,.7z", icon: "📦" },
  { value: "document", label: "مستند", accept: ".doc,.docx,.ppt,.pptx,.xls,.xlsx", icon: "📑" },
];

function LessonForm({
  courseId,
  lesson,
  onClose,
  onSaved,
}: {
  courseId: string;
  lesson?: LessonRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [type, setType] = useState(lesson?.type ?? "video");
  const [content, setContent] = useState(lesson?.content ?? "");
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? "");
  const [pdfUrl, setPdfUrl] = useState(lesson?.pdf_url ?? "");
  const [audioUrl, setAudioUrl] = useState(lesson?.audio_url ?? "");
  const [attachmentUrl, setAttachmentUrl] = useState(lesson?.attachment_url ?? "");
  const [attachmentType, setAttachmentType] = useState("pdf");
  const [scriptText, setScriptText] = useState(lesson?.script_text ?? "");
  const [aiContext, setAiContext] = useState(lesson?.ai_context ?? "");
  const [summary, setSummary] = useState(lesson?.summary ?? "");
  const [duration, setDuration] = useState(lesson?.duration_minutes ?? 0);
  const [isPreview, setIsPreview] = useState(lesson?.is_preview ?? false);
  const [saving, setSaving] = useState(false);
  const [generatingTranscript, setGeneratingTranscript] = useState(false);
  const { user } = useSession();
  const canUpload = user?.role === "owner" || user?.role === "instructor";

  async function handleUpload(field: "video" | "pdf" | "audio" | "attachment", file: File) {
    if (!canUpload) { toast.error("رفع الملفات متاح للمالك فقط"); return; }
    const id = toast.loading("جارٍ الرفع... 0%");
    try {
      const folder = field === "attachment" ? "attachments" : field;
      const url = await uploadMedia(file, folder, (pct) =>
        toast.loading(`جارٍ الرفع... ${pct}%`, { id }),
      );
      if (field === "video") setVideoUrl(url);
      if (field === "pdf") setPdfUrl(url);
      if (field === "audio") setAudioUrl(url);
      if (field === "attachment") setAttachmentUrl(url);
      toast.success("تم الرفع بنجاح", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع", { id });
    }
  }

  // استخراج الصوت تلقائياً من الفيديو (نسخ رابط الفيديو كمصدر صوت)
  function handleAutoExtractAudio() {
    if (!videoUrl) { toast.error("أضف رابط الفيديو أولاً"); return; }
    setAudioUrl(videoUrl);
    toast.success("تم تعيين مصدر الصوت من الفيديو. يمكنك استبداله بملف صوتي مستقل لاحقاً.");
  }

  // توليد النص التلقائي باستخدام الذكاء الاصطناعي
  async function handleGenerateTranscript() {
    if (!title) { toast.error("أدخل عنوان الدرس أولاً"); return; }
    setGeneratingTranscript(true);
    try {
      const result = await generateTranscript({
        data: { title, content, aiContext, summary },
      });
      if (result.ok) {
        setScriptText(result.text);
        toast.success("تم توليد النص التلقائي");
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل توليد النص");
    } finally {
      setGeneratingTranscript(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      title,
      type: type as "video" | "text" | "pdf" | "link" | "quiz" | "audio" | never,
      content: content || null,
      video_url: videoUrl || null,
      pdf_url: pdfUrl || null,
      audio_url: audioUrl || null,
      attachment_url: attachmentUrl || null,
      script_text: scriptText || null,
      ai_context: aiContext || null,
      summary: summary || null,
      duration_minutes: duration,
      is_preview: isPreview,
    };

    let error;
    if (lesson) {
      ({ error } = await supabase.from("lessons").update(payload).eq("id", lesson.id));
    } else {
      const { data: existing } = await supabase
        .from("lessons")
        .select("position")
        .eq("course_id", courseId)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = (existing?.[0]?.position ?? -1) + 1;
      ({ error } = await supabase
        .from("lessons")
        .insert({ ...payload, course_id: courseId, position: nextPos }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lesson ? "تم تحديث الدرس" : "تم إضافة الدرس");
    onSaved();
  }

  // اختبار إمكانية فتح الرابط
  function handleTestUrl(url: string, label: string) {
    if (!url) { toast.error(`لا يوجد رابط لـ ${label}`); return; }
    window.open(url.startsWith("course-media://")
      ? `https://qjvcmjqjgnylgboqlufh.supabase.co/storage/v1/object/public/course-media/${url.replace("course-media://", "")}`
      : url, "_blank");
  }

  const selectedAttType = ATTACHMENT_TYPES.find((t) => t.value === attachmentType) ?? ATTACHMENT_TYPES[0];

  return (
    <Card className="mb-4 border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          {lesson ? "تعديل الدرس" : "درس جديد"}
          <X className="h-4 w-4 cursor-pointer" onClick={onClose} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>عنوان الدرس</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الدرس" />
        </div>
        <div className="space-y-1.5">
          <Label>النوع</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="video">🎬 فيديو</SelectItem>
              <SelectItem value="audio">🎧 صوت (بودكاست)</SelectItem>
              <SelectItem value="pdf">📄 PDF</SelectItem>
              <SelectItem value="text">📝 نص</SelectItem>
              <SelectItem value="link">🔗 رابط</SelectItem>
              <SelectItem value="quiz">❓ اختبار</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>ملخص</Label>
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="ملخص قصير" />
        </div>
        <div className="space-y-1.5">
          <Label>المحتوى النصي</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="محتوى الدرس"
            className="min-h-[80px]"
          />
        </div>

        {/* رابط الفيديو */}
        {type === "video" && (
          <div className="space-y-1.5">
            <Label>رابط الفيديو</Label>
            <div className="flex gap-2">
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="رابط الفيديو أو course-media://..." />
              <label className={canUpload ? "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-card hover:bg-muted" : "hidden"}>
                <input type="file" accept="video/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("video", f); }} />
                <Upload className="h-4 w-4" />
              </label>
              <Button type="button" size="icon" variant="outline" title="اختبار الرابط"
                onClick={() => handleTestUrl(videoUrl, "الفيديو")}>
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* رابط PDF */}
        {type === "pdf" && (
          <div className="space-y-1.5">
            <Label>رابط PDF</Label>
            <div className="flex gap-2">
              <Input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="رابط PDF" />
              <label className={canUpload ? "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-card hover:bg-muted" : "hidden"}>
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("pdf", f); }} />
                <Upload className="h-4 w-4" />
              </label>
              <Button type="button" size="icon" variant="outline" title="اختبار الرابط"
                onClick={() => handleTestUrl(pdfUrl, "PDF")}>
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* البودكاست - مع استخراج تلقائي من الفيديو */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>البودكاست (صوت)</Label>
            {type === "video" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleAutoExtractAudio}
                title="استخراج الصوت من الفيديو تلقائياً"
              >
                <Wand2 className="me-1 h-3 w-3 text-gold" />
                تلقائي من الفيديو
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="رابط الصوت (mp3, m4a...)" />
            <label className={canUpload ? "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-card hover:bg-muted" : "hidden"}>
              <input type="file" accept="audio/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("audio", f); }} />
              <Headphones className="h-4 w-4" />
            </label>
            <Button type="button" size="icon" variant="outline" title="اختبار رابط الصوت"
              onClick={() => handleTestUrl(audioUrl, "الصوت")}>
              <Headphones className="h-4 w-4" />
            </Button>
          </div>
          {audioUrl && (
            <audio src={audioUrl} controls className="mt-1 w-full" />
          )}
        </div>

        {/* مرفقات إضافية */}
        <div className="space-y-1.5">
          <Label>مرفق إضافي</Label>
          <div className="mb-1.5 flex flex-wrap gap-1">
            {ATTACHMENT_TYPES.map((at) => (
              <button
                key={at.value}
                type="button"
                onClick={() => setAttachmentType(at.value)}
                className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                  attachmentType === at.value
                    ? "gold-gradient border-transparent text-gold-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {at.icon} {at.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder={`رابط ${selectedAttType.label}`} />
            <label className={canUpload ? "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-card hover:bg-muted" : "hidden"}>
              <input type="file" accept={selectedAttType.accept} className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("attachment", f); }} />
              <Archive className="h-4 w-4" />
            </label>
            <Button type="button" size="icon" variant="outline" title="اختبار الرابط"
              onClick={() => handleTestUrl(attachmentUrl, "المرفق")}>
              <FileImage className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* النص / السكربت مع توليد ذكي */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>نص السكربت / النسخة النصية</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={generatingTranscript}
              onClick={handleGenerateTranscript}
            >
              {generatingTranscript ? (
                <Loader2 className="me-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="me-1 h-3 w-3 text-gold" />
              )}
              توليد بالذكاء الاصطناعي
            </Button>
          </div>
          <Textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            placeholder="النص الكامل للدرس (يمكن توليده تلقائياً بالذكاء الاصطناعي أو تعديله)"
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label>سياق الذكاء الاصطناعي</Label>
          <Textarea
            value={aiContext}
            onChange={(e) => setAiContext(e.target.value)}
            placeholder="معلومات إضافية للمساعد الذكي (نقاط رئيسية، مصطلحات، ...)"
            className="min-h-[60px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>المدة (دقائق)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div className="flex items-end gap-2 pb-1.5">
            <Switch checked={isPreview} onCheckedChange={setIsPreview} />
            <Label>معاينة مجانية</Label>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="w-full gold-gradient text-gold-foreground"
        >
          {saving ? "جارٍ الحفظ..." : lesson ? "حفظ التعديلات" : "إضافة الدرس"}
        </Button>
      </CardContent>
    </Card>
  );
}
