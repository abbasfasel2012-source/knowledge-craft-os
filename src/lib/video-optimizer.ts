/**
 * Video optimization utilities for efficient streaming and storage
 */

export interface VideoOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: "low" | "medium" | "high";
  format?: "mp4" | "webm" | "ogg";
}

export async function generateVideoThumbnail(
  file: File,
  timestamp: number = 5,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve(null);
      return;
    }

    video.onloadedmetadata = () => {
      canvas.width = 320;
      canvas.height = 180;
      video.currentTime = Math.min(timestamp, video.duration);
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.7,
      );
    };

    video.onerror = () => {
      resolve(null);
    };

    video.src = URL.createObjectURL(file);
  });
}

export function getVideoPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function calculateVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const cleanup = () => URL.revokeObjectURL(video.src);

    video.onloadedmetadata = () => {
      cleanup();
      resolve(Math.round(video.duration));
    };

    video.onerror = () => {
      cleanup();
      resolve(0);
    };

    video.src = URL.createObjectURL(file);
  });
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export async function validateVideoFile(file: File): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Check MIME type
  if (!file.type.startsWith("video/")) {
    return { valid: false, error: "يجب اختيار ملف فيديو صحيح" };
  }

  // Check file size (2GB max)
  const maxSize = 2 * 1024 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: "حجم الملف يجب أن لا يتجاوز 2GB" };
  }

  // Validate with metadata
  try {
    const duration = await calculateVideoDuration(file);
    if (duration === 0) {
      return { valid: false, error: "لا يمكن قراءة الفيديو" };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: "خطأ في معالجة الفيديو" };
  }
}
