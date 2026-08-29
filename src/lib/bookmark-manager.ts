/**
 * Bookmark and save management for courses and videos
 */

export interface Bookmark {
  id: string;
  userId: string;
  courseId: string;
  videoId?: string;
  timestamp: number;
  note?: string;
  createdAt: Date;
}

export interface SavedItem {
  id: string;
  userId: string;
  courseId: string;
  type: "course" | "video";
  savedAt: Date;
  reminders?: Date[];
}

export function createBookmark(
  userId: string,
  courseId: string,
  videoId?: string,
  note?: string,
  timestamp?: number,
): Bookmark {
  return {
    id: `bookmark_${Date.now()}`,
    userId,
    courseId,
    videoId,
    timestamp: timestamp || 0,
    note,
    createdAt: new Date(),
  };
}

export function createSavedItem(
  userId: string,
  courseId: string,
  type: "course" | "video" = "course",
): SavedItem {
  return {
    id: `saved_${Date.now()}`,
    userId,
    courseId,
    type,
    savedAt: new Date(),
    reminders: [],
  };
}

export function formatBookmarkTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
