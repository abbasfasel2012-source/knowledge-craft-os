export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          meta: Json;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          meta?: Json;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          meta?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      ads: {
        Row: {
          created_at: string;
          created_by: string;
          ends_at: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          link_url: string | null;
          placement: string;
          position: number;
          starts_at: string | null;
          title: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          link_url?: string | null;
          placement?: string;
          position?: number;
          starts_at?: string | null;
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          link_url?: string | null;
          placement?: string;
          position?: number;
          starts_at?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          body: string;
          course_id: string | null;
          created_at: string;
          created_by: string;
          id: string;
          title: string;
        };
        Insert: {
          body: string;
          course_id?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          title: string;
        };
        Update: {
          body?: string;
          course_id?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      attempt_answers: {
        Row: {
          ai_feedback: string | null;
          answer: string | null;
          attempt_id: string;
          awarded_points: number;
          created_at: string;
          id: string;
          is_correct: boolean | null;
          question_id: string;
          user_id: string;
        };
        Insert: {
          ai_feedback?: string | null;
          answer?: string | null;
          attempt_id: string;
          awarded_points?: number;
          created_at?: string;
          id?: string;
          is_correct?: boolean | null;
          question_id: string;
          user_id: string;
        };
        Update: {
          ai_feedback?: string | null;
          answer?: string | null;
          attempt_id?: string;
          awarded_points?: number;
          created_at?: string;
          id?: string;
          is_correct?: boolean | null;
          question_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      badges: {
        Row: {
          description: string;
          icon: string;
          id: string;
          name: string;
          points_required: number;
        };
        Insert: {
          description?: string;
          icon?: string;
          id?: string;
          name: string;
          points_required?: number;
        };
        Update: {
          description?: string;
          icon?: string;
          id?: string;
          name?: string;
          points_required?: number;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          icon: string | null;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          code: string;
          course_id: string;
          id: string;
          issued_at: string;
          user_id: string;
        };
        Insert: {
          code?: string;
          course_id: string;
          id?: string;
          issued_at?: string;
          user_id: string;
        };
        Update: {
          code?: string;
          course_id?: string;
          id?: string;
          issued_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          brochure_url: string | null;
          category_id: string | null;
          certificate_enabled: boolean;
          cover_url: string | null;
          created_at: string;
          description: string;
          duration_minutes: number;
          gallery: Json;
          id: string;
          instructor_id: string;
          is_free: boolean;
          language: string;
          level: string;
          price: number;
          sequential: boolean;
          slug: string;
          status: Database["public"]["Enums"]["course_status"];
          summary: string;
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          brochure_url?: string | null;
          category_id?: string | null;
          certificate_enabled?: boolean;
          cover_url?: string | null;
          created_at?: string;
          description?: string;
          duration_minutes?: number;
          gallery?: Json;
          id?: string;
          instructor_id: string;
          is_free?: boolean;
          language?: string;
          level?: string;
          price?: number;
          sequential?: boolean;
          slug: string;
          status?: Database["public"]["Enums"]["course_status"];
          summary?: string;
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          brochure_url?: string | null;
          category_id?: string | null;
          certificate_enabled?: boolean;
          cover_url?: string | null;
          created_at?: string;
          description?: string;
          duration_minutes?: number;
          gallery?: Json;
          id?: string;
          instructor_id?: string;
          is_free?: boolean;
          language?: string;
          level?: string;
          price?: number;
          sequential?: boolean;
          slug?: string;
          status?: Database["public"]["Enums"]["course_status"];
          summary?: string;
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          completed_at: string | null;
          course_id: string;
          created_at: string;
          id: string;
          progress: number;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          course_id: string;
          created_at?: string;
          id?: string;
          progress?: number;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          course_id?: string;
          created_at?: string;
          id?: string;
          progress?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_notes: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          lesson_id: string;
          timestamp_seconds: number;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          lesson_id: string;
          timestamp_seconds?: number;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          lesson_id?: string;
          timestamp_seconds?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_progress: {
        Row: {
          completed: boolean;
          course_id: string;
          id: string;
          last_position: number;
          lesson_id: string;
          seconds_watched: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed?: boolean;
          course_id: string;
          id?: string;
          last_position?: number;
          lesson_id: string;
          seconds_watched?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed?: boolean;
          course_id?: string;
          id?: string;
          last_position?: number;
          lesson_id?: string;
          seconds_watched?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          ai_context: string | null;
          attachment_url: string | null;
          audio_url: string | null;
          content: string | null;
          course_id: string;
          created_at: string;
          duration_minutes: number;
          gallery: Json;
          id: string;
          is_preview: boolean;
          pdf_url: string | null;
          position: number;
          script_text: string | null;
          section_id: string | null;
          summary: string | null;
          title: string;
          type: Database["public"]["Enums"]["lesson_type"];
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          ai_context?: string | null;
          attachment_url?: string | null;
          audio_url?: string | null;
          content?: string | null;
          course_id: string;
          created_at?: string;
          duration_minutes?: number;
          gallery?: Json;
          id?: string;
          is_preview?: boolean;
          pdf_url?: string | null;
          position?: number;
          script_text?: string | null;
          section_id?: string | null;
          summary?: string | null;
          title: string;
          type?: Database["public"]["Enums"]["lesson_type"];
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          ai_context?: string | null;
          attachment_url?: string | null;
          audio_url?: string | null;
          content?: string | null;
          course_id?: string;
          created_at?: string;
          duration_minutes?: number;
          gallery?: Json;
          id?: string;
          is_preview?: boolean;
          pdf_url?: string | null;
          position?: number;
          script_text?: string | null;
          section_id?: string | null;
          summary?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["lesson_type"];
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          is_read: boolean;
          link: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          about: string;
          accent_color: string;
          allow_signup: boolean;
          certificate_footer: string;
          contact_email: string;
          id: number;
          logo_url: string | null;
          platform_name: string;
          primary_color: string;
          tagline: string;
          updated_at: string;
        };
        Insert: {
          about?: string;
          accent_color?: string;
          allow_signup?: boolean;
          certificate_footer?: string;
          contact_email?: string;
          id?: number;
          logo_url?: string | null;
          platform_name?: string;
          primary_color?: string;
          tagline?: string;
          updated_at?: string;
        };
        Update: {
          about?: string;
          accent_color?: string;
          allow_signup?: boolean;
          certificate_footer?: string;
          contact_email?: string;
          id?: number;
          logo_url?: string | null;
          platform_name?: string;
          primary_color?: string;
          tagline?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          full_name: string;
          id: string;
          phone: string | null;
          points: number;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          phone?: string | null;
          points?: number;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          points?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      qna_posts: {
        Row: {
          body: string;
          course_id: string;
          created_at: string;
          id: string;
          is_answer: boolean;
          lesson_id: string | null;
          parent_id: string | null;
          user_id: string;
        };
        Insert: {
          body: string;
          course_id: string;
          created_at?: string;
          id?: string;
          is_answer?: boolean;
          lesson_id?: string | null;
          parent_id?: string | null;
          user_id: string;
        };
        Update: {
          body?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          is_answer?: boolean;
          lesson_id?: string | null;
          parent_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qna_posts_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qna_posts_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qna_posts_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "qna_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          correct_answer: string | null;
          explanation: string | null;
          id: string;
          options: Json;
          points: number;
          position: number;
          prompt: string;
          quiz_id: string;
          type: Database["public"]["Enums"]["question_type"];
        };
        Insert: {
          correct_answer?: string | null;
          explanation?: string | null;
          id?: string;
          options?: Json;
          points?: number;
          position?: number;
          prompt: string;
          quiz_id: string;
          type?: Database["public"]["Enums"]["question_type"];
        };
        Update: {
          correct_answer?: string | null;
          explanation?: string | null;
          id?: string;
          options?: Json;
          points?: number;
          position?: number;
          prompt?: string;
          quiz_id?: string;
          type?: Database["public"]["Enums"]["question_type"];
        };
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          ai_feedback: string | null;
          course_id: string;
          created_at: string;
          id: string;
          max_score: number;
          passed: boolean;
          quiz_id: string;
          score: number;
          status: string;
          submitted_at: string | null;
          user_id: string;
        };
        Insert: {
          ai_feedback?: string | null;
          course_id: string;
          created_at?: string;
          id?: string;
          max_score?: number;
          passed?: boolean;
          quiz_id: string;
          score?: number;
          status?: string;
          submitted_at?: string | null;
          user_id: string;
        };
        Update: {
          ai_feedback?: string | null;
          course_id?: string;
          created_at?: string;
          id?: string;
          max_score?: number;
          passed?: boolean;
          quiz_id?: string;
          score?: number;
          status?: string;
          submitted_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          course_id: string;
          created_at: string;
          description: string;
          id: string;
          is_active: boolean;
          lesson_id: string | null;
          max_attempts: number;
          pass_score: number;
          show_answers: boolean;
          shuffle: boolean;
          time_limit_minutes: number;
          title: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          lesson_id?: string | null;
          max_attempts?: number;
          pass_score?: number;
          show_answers?: boolean;
          shuffle?: boolean;
          time_limit_minutes?: number;
          title: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          lesson_id?: string | null;
          max_attempts?: number;
          pass_score?: number;
          show_answers?: boolean;
          shuffle?: boolean;
          time_limit_minutes?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      reactions: {
        Row: {
          course_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          lesson_id: string | null;
          user_id: string;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          lesson_id?: string | null;
          user_id: string;
        };
        Update: {
          course_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          lesson_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reactions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reactions_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          body: string;
          course_id: string;
          created_at: string;
          id: string;
          rating: number;
          user_id: string;
        };
        Insert: {
          body?: string;
          course_id: string;
          created_at?: string;
          id?: string;
          rating: number;
          user_id: string;
        };
        Update: {
          body?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          rating?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_items: {
        Row: {
          course_id: string | null;
          created_at: string;
          id: string;
          lesson_id: string | null;
          user_id: string;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string;
          id?: string;
          lesson_id?: string | null;
          user_id: string;
        };
        Update: {
          course_id?: string | null;
          created_at?: string;
          id?: string;
          lesson_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_items_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_items_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      sections: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          position: number;
          title: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          position?: number;
          title: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          position?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      user_badges: {
        Row: {
          badge_id: string;
          earned_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          badge_id: string;
          earned_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          badge_id?: string;
          earned_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_role: "owner" | "instructor" | "moderator" | "student";
      course_status: "draft" | "published" | "archived";
      lesson_type: "video" | "pdf" | "text" | "link" | "quiz";
      question_type: "mcq" | "true_false" | "short" | "essay";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "instructor", "moderator", "student"],
      course_status: ["draft", "published", "archived"],
      lesson_type: ["video", "pdf", "text", "link", "quiz"],
      question_type: ["mcq", "true_false", "short", "essay"],
    },
  },
} as const;
