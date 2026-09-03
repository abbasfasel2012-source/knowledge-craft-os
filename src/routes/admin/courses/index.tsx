import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
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
import { Plus, Edit3, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadMedia } from "@/lib/storage";

export const Route = createFileRoute("/admin/courses/")({
  head: () => ({ meta: [{ title: "إدارة الدورات — تدريب" }] }),
  component: AdminCourses,
});

function AdminCourses() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,slug,status,level,is_free,price,cover_url,category:categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="px-4 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">إدارة الدورات</h1>
        <Button
          onClick={() => setCreating(true)}
          size="sm"
          className="gold-gradient text-gold-foreground"
        >
          <Plus className="h-4 w-4" /> دورة جديدة
        </Button>
      </div>

      {creating && (
        <CourseForm
          categories={categories ?? []}
          userId={user?.id ?? ""}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
          }}
        />
      )}

      <div className="space-y-2">
        {courses?.map((c) => {
          const cat = c.category as unknown as { name: string } | null;
          return (
            <Card key={c.id} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {c.cover_url && (
                      <img src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold">{c.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 font-semibold",
                          c.status === "published" ? "bg-green-500/20 text-green-600" : "bg-muted",
                        )}
                      >
                        {c.status === "published"
                          ? "منشور"
                          : c.status === "draft"
                            ? "مسودة"
                            : "مؤرشف"}
                      </span>
                      {cat && <span>{cat.name}</span>}
                      <span>{c.is_free ? "مجاني" : `${c.price}$`}</span>
                    </div>
                  </div>
                  <Link to="/admin/courses/$id" params={{ id: c.id }}>
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!courses || courses.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            لا توجد دورات. أنشئ أول دورة!
          </p>
        )}
      </div>
    </div>
  );
}

function CourseForm({
  categories,
  userId,
  onClose,
  onSaved,
}: {
  categories: { id: string; name: string; slug: string }[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [level, setLevel] = useState("beginner");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState(0);
  const [status, setStatus] = useState("draft");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleUploadCover(file: File) {
    try {
      const url = await uploadMedia(file, "covers");
      setCoverUrl(url);
      toast.success("تم رفع الصورة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    }
  }

  async function handleSave() {
    setSaving(true);
    const slug = title.trim().toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const { error } = await supabase.from("courses").insert({
      title,
      slug,
      summary,
      description,
      category_id: categoryId || null,
      instructor_id: userId,
      level,
      is_free: isFree,
      price: isFree ? 0 : price,
      status: status as "draft" | "published" | "archived",
      cover_url: coverUrl || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إنشاء الدورة");
    onSaved();
  }

  return (
    <Card className="mb-4 border-border">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          دورة جديدة <X className="h-4 w-4 cursor-pointer" onClick={onClose} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>عنوان الدورة</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان الدورة"
          />
        </div>
        <div className="space-y-1.5">
          <Label>ملخص قصير</Label>
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="ملخص" />
        </div>
        <div className="space-y-1.5">
          <Label>الوصف الكامل</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف الدورة"
            className="min-h-[80px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>التصنيف</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>المستوى</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">مبتدئ</SelectItem>
                <SelectItem value="intermediate">متوسط</SelectItem>
                <SelectItem value="advanced">متقدم</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select value={status} onValueChange={setStatus}>
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
          <div className="space-y-1.5">
            <Label>مجاني؟</Label>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={isFree} onCheckedChange={setIsFree} />
              <span className="text-xs">{isFree ? "مجاني" : "مدفوع"}</span>
            </div>
          </div>
        </div>
        {!isFree && (
          <div className="space-y-1.5">
            <Label>السعر ($)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>صورة الغلاف</Label>
          <div className="flex gap-2">
            <Input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="رابط الصورة أو ارفع"
            />
            <label className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-card hover:bg-muted">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadCover(f);
                }}
              />
              <Upload className="h-4 w-4" />
            </label>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="w-full gold-gradient text-gold-foreground"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ الدورة"}
        </Button>
      </CardContent>
    </Card>
  );
}
