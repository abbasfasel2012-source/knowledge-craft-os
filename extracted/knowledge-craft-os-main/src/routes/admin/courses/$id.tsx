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
} from "lucide-react";

export const Route = createFileRoute("/admin/courses/$id")({
  head: () => ({ meta: [{ title: "تحرير الدورة — مِرقاة" }] }),
  component: EditCourse,
});

function EditCourse() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [showLessonForm, setShowLessonForm] = useState(false);

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
      const { error } = await supabase.from("courses").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث الدورة");
      queryClient.invalidateQueries({ queryKey: ["admin-course"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="px-4 pt-6">
      <Link
        to="/admin/courses"
        className="mb-3 text-xs text-muted-foreground hover:text-foreground"
      >
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
            <Select
              defaultValue={course?.status}
              onValueChange={(v) => updateMutation.mutate({ status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
          {lessons?.map((lesson) => (
            <Card key={lesson.id} className="border-border">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  {lesson.type === "video" ? (
                    <Play className="h-4 w-4" />
                  ) : lesson.type === "pdf" ? (
                    <FileText className="h-4 w-4" />
                  ) : lesson.type === "quiz" ? (
                    <HelpCircle className="h-4 w-4" />
                  ) : lesson.type === "link" ? (
                    <LinkIcon className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-1 text-sm font-medium">{lesson.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {lesson.type} • {lesson.duration_minutes} د
                  </p>
                </div>
                <Link to="/course/$slug" params={{ slug: course?.slug ?? "" }}>
                  <Button variant="outline" size="sm">
                    عرض
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
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

function LessonForm({
  courseId,
  onClose,
  onSaved,
}: {
  courseId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [summary, setSummary] = useState("");
  const [duration, setDuration] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUpload(field: "video" | "pdf" | "audio", file: File) {
    const path = `${field}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("course-media").upload(path, file);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("course-media").getPublicUrl(path);
    if (field === "video") setVideoUrl(data.publicUrl);
    if (field === "pdf") setPdfUrl(data.publicUrl);
    if (field === "audio") setAudioUrl(data.publicUrl);
    toast.success("تم الرفع");
  }

  async function handleSave() {
    setSaving(true);
    const { data: existing } = await supabase
      .from("lessons")
      .select("position")
      .eq("course_id", courseId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = (existing?.[0]?.position ?? -1) + 1;
    const { error } = await supabase.from("lessons").insert({
      course_id: courseId,
      title,
      type,
      content: content || null,
      video_url: videoUrl || null,
      pdf_url: pdfUrl || null,
      audio_url: audioUrl || null,
      script_text: scriptText || null,
      ai_context: aiContext || null,
      summary: summary || null,
      duration_minutes: duration,
      position: nextPos,
      is_preview: isPreview,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إضافة الدرس");
    onSaved();
  }

  return (
    <Card className="mb-4 border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          درس جديد <X className="h-4 w-4 cursor-pointer" onClick={onClose} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>عنوان الدرس</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان الدرس"
          />
        </div>
        <div className="space-y-1.5">
          <Label>النوع</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">فيديو</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="text">نص</SelectItem>
              <SelectItem value="link">رابط</SelectItem>
              <SelectItem value="quiz">اختبار</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>ملخص</Label>
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="ملخص قصير"
          />
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
        {type === "video" && (
          <div className="space-y-1.5">
            <Label>رابط الفيديو</Label>
            <div className="flex gap-2">
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="رابط الفيديو"
              />
              <label>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload("video", f);
                  }}
                />
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </label>
            </div>
          </div>
        )}
        {type === "pdf" && (
          <div className="space-y-1.5">
            <Label>رابط PDF</Label>
            <div className="flex gap-2">
              <Input
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="رابط PDF"
              />
              <label>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload("pdf", f);
                  }}
                />
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </label>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>رابط البودكاست</Label>
          <div className="flex gap-2">
            <Input
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="رابط الصوت"
            />
            <label>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload("audio", f);
                }}
              />
              <Button variant="outline" size="icon">
                <Headphones className="h-4 w-4" />
              </Button>
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>نص السكربت</Label>
          <Textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            placeholder="نص السكربت"
            className="min-h-[60px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label>سياق الذكاء الاصطناعي</Label>
          <Textarea
            value={aiContext}
            onChange={(e) => setAiContext(e.target.value)}
            placeholder="معلومات إضافية للمساعد الذكي"
            className="min-h-[60px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>المدة (دقائق)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
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
          {saving ? "جارٍ الحفظ..." : "إضافة الدرس"}
        </Button>
      </CardContent>
    </Card>
  );
}
