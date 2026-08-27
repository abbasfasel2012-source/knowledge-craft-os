import { useState, useRef } from "react";
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VideoUploadCardProps {
  courseId: string;
  onUploaded?: () => void;
}

interface VideoMetadata {
  title: string;
  description: string;
}

export function VideoUploadCard({ courseId, onUploaded }: VideoUploadCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [metadata, setMetadata] = useState<VideoMetadata>({
    title: "",
    description: "",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (max 2GB)
    if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
      setError("حجم الملف يجب أن لا يتجاوز 2GB");
      return;
    }

    // Validate file type
    if (!selectedFile.type.startsWith("video/")) {
      setError("يجب اختيار ملف فيديو صحيح");
      return;
    }

    setFile(selectedFile);
    setError("");
  };

  const handleUpload = async () => {
    if (!file || !metadata.title.trim()) {
      setError("الرجاء إدخال عنوان الفيديو");
      return;
    }

    setIsUploading(true);
    setError("");
    try {
      // Upload the actual file to Supabase Storage
      const path = `video/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("course-media")
        .upload(path, file, {
          onUploadProgress: (evt: { loaded: number; total?: number }) => {
            if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 90));
          },
        } as never);

      if (uploadError) {
        setError(`فشل الرفع: ${uploadError.message}`);
        setIsUploading(false);
        return;
      }

      setProgress(90);
      const { data: publicUrlData } = supabase.storage.from("course-media").getPublicUrl(path);

      // Determine next lesson position
      const { data: existing } = await supabase
        .from("lessons")
        .select("position")
        .eq("course_id", courseId)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = (existing?.[0]?.position ?? -1) + 1;

      const { error: insertError } = await supabase.from("lessons").insert({
        course_id: courseId,
        title: metadata.title,
        type: "video",
        content: metadata.description || null,
        video_url: publicUrlData.publicUrl,
        duration_minutes: 0,
        position: nextPos,
        is_preview: false,
      });

      if (insertError) {
        setError(`فشل حفظ الدرس: ${insertError.message}`);
        setIsUploading(false);
        return;
      }

      setProgress(100);
      toast.success("تم رفع الفيديو بنجاح!");
      setFile(null);
      setMetadata({ title: "", description: "" });
      setProgress(0);
      setIsUploading(false);
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ في رفع الفيديو");
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <h3 className="font-bold">رفع فيديو جديد</h3>

      {/* File Input Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-background/50 p-8 text-center transition-colors hover:border-gold hover:bg-gold/5"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        {file ? (
          <div className="space-y-2">
            <CheckCircle2 className="mx-auto h-8 w-8 text-gold" />
            <p className="text-sm font-semibold">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">اختر فيديو أو اسحبه هنا</p>
            <p className="text-xs text-muted-foreground">MP4, WebM, Ogg — حتى 2GB</p>
          </div>
        )}
      </div>

      {/* Metadata Form */}
      {file && (
        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-xs font-semibold">عنوان الفيديو *</label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              placeholder="أدخل عنوان الفيديو"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold">الوصف</label>
            <textarea
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              placeholder="وصف الفيديو (اختياري)"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">جاري الرفع...</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {file && (
          <button
            onClick={() => {
              setFile(null);
              setMetadata({ title: "", description: "" });
              setProgress(0);
            }}
            disabled={isUploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-card disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            إلغاء
          </button>
        )}
        {file && (
          <button
            onClick={handleUpload}
            disabled={isUploading || !metadata.title.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg gold-gradient px-4 py-2 text-sm font-semibold text-gold-foreground transition-opacity disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            رفع
          </button>
        )}
      </div>
    </div>
  );
}
