/**
 * Type definitions for database schema
 */

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description?: string;
  category_id?: string;
  instructor_id: string;
  cover_url?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  is_free: boolean;
  price: number;
  status: 'draft' | 'published' | 'archived';
  students_count: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_minutes: number;
  sequence: number;
  transcript?: string;
  ai_summary?: string;
  key_points?: string[];
  created_at: string;
  updated_at: string;
}

export interface CourseMaterial {
  id: string;
  course_id: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  description?: string;
  sequence: number;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  completed_at?: string;
  enrolled_at: string;
}

export interface CompletionRecord {
  id: string;
  user_id: string;
  course_id: string;
  video_id?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  progress: number;
  time_spent: number;
  started_at: string;
  completed_at?: string;
  course_title: string;
  notes?: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  course_name: string;
  certificate_url: string;
  issued_at: string;
  verified: boolean;
}

export interface UserBadge {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  icon_url?: string;
  earned_at: string;
}

export interface Comment {
  id: string;
  course_id: string;
  user_id: string;
  content: string;
  likes: number;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  course_id: string;
  video_id?: string;
  timestamp: number;
  note?: string;
  created_at: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  total_courses: number;
  completed_courses: number;
  total_hours: number;
  total_certificates: number;
  total_badges: number;
  average_completion_rate: number;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InteractionLog {
  id: string;
  user_id: string;
  course_id?: string;
  video_id?: string;
  type: string;
  metadata?: Record<string, any>;
  created_at: string;
}
