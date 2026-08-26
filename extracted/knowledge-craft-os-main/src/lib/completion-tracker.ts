/**
 * Completion tracking system for courses, videos, and engagement
 */

export interface CompletionRecord {
  id: string;
  courseId: string;
  videoId?: string;
  userId: string;
  type: 'course' | 'video' | 'quiz' | 'certificate';
  status: 'in_progress' | 'completed' | 'abandoned';
  progress: number; // 0-100
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number; // seconds
  certificateId?: string;
  notes?: string;
}

export interface UserStats {
  userId: string;
  totalCoursesEnrolled: number;
  totalCoursesCompleted: number;
  totalLearningHours: number;
  totalCertificates: number;
  totalBadges: number;
  averageCompletionRate: number;
  lastActivityDate: Date;
}

export function createCompletionRecord(
  userId: string,
  courseId: string,
  videoId?: string
): CompletionRecord {
  return {
    id: `completion_${Date.now()}`,
    courseId,
    videoId,
    userId,
    type: videoId ? 'video' : 'course',
    status: 'in_progress',
    progress: 0,
    startedAt: new Date(),
    timeSpent: 0,
  };
}

export function updateCompletionRecord(
  record: CompletionRecord,
  updates: Partial<CompletionRecord>
): CompletionRecord {
  return { ...record, ...updates };
}

export function calculateCompletionPercentage(
  watchedSeconds: number,
  totalSeconds: number
): number {
  if (totalSeconds === 0) return 0;
  return Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100));
}

export function calculateUserStats(records: CompletionRecord[]): UserStats {
  const userId = records[0]?.userId || '';
  const completedCourses = new Set(
    records
      .filter((r) => r.type === 'course' && r.status === 'completed')
      .map((r) => r.courseId)
  );

  const totalHours = Math.round(
    records.reduce((sum, r) => sum + r.timeSpent, 0) / 3600
  );

  const certificates = records.filter(
    (r) => r.type === 'certificate' && r.status === 'completed'
  );

  return {
    userId,
    totalCoursesEnrolled: new Set(records.map((r) => r.courseId)).size,
    totalCoursesCompleted: completedCourses.size,
    totalLearningHours: totalHours,
    totalCertificates: certificates.length,
    totalBadges: 0, // Calculated separately
    averageCompletionRate:
      records.length > 0
        ? records.reduce((sum, r) => sum + r.progress, 0) / records.length
        : 0,
    lastActivityDate: new Date(),
  };
}
