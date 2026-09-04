-- =====================================================================
-- Migration: إصلاح التخزين والصلاحيات والجداول المفقودة
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. إنشاء bucket التخزين "course-media" إذا لم يكن موجوداً
-- ---------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-media',
  'course-media',
  false,
  2147483648, -- 2GB
  ARRAY['video/mp4','video/webm','video/ogg','video/quicktime','application/pdf','audio/mpeg','audio/ogg','audio/wav','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = 2147483648,
      allowed_mime_types = ARRAY['video/mp4','video/webm','video/ogg','video/quicktime','application/pdf','audio/mpeg','audio/ogg','audio/wav','image/jpeg','image/png','image/webp'];

-- ---------------------------------------------------------------
-- 2. حذف السياسات القديمة وإعادة إنشائها بشكل صحيح
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can upload course media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read course media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete course media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update course media" ON storage.objects;

-- السماح لأصحاب الأدوار (owner/instructor/moderator) برفع الملفات
CREATE POLICY "Staff can upload course media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'instructor', 'moderator')
    )
  );

-- السماح للمستخدمين المسجّلين بقراءة الملفات
CREATE POLICY "Authenticated users can read course media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'course-media');

-- السماح للمشرفين بحذف الملفات
CREATE POLICY "Staff can delete course media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'instructor', 'moderator')
    )
  );

-- ---------------------------------------------------------------
-- 3. جدول categories (إذا لم يكن موجوداً)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name    text NOT NULL,
  slug    text NOT NULL UNIQUE,
  icon    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
CREATE POLICY "Anyone can read categories"
  ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff can manage categories" ON public.categories;
CREATE POLICY "Staff can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));

-- ---------------------------------------------------------------
-- 4. جدول platform_settings (إذا لم يكن موجوداً)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id               integer PRIMARY KEY DEFAULT 1,
  platform_name    text NOT NULL DEFAULT 'تدريب',
  tagline          text NOT NULL DEFAULT 'منصة التدريب العربية',
  about            text NOT NULL DEFAULT '',
  contact_email    text NOT NULL DEFAULT '',
  logo_url         text,
  primary_color    text NOT NULL DEFAULT '#16a34a',
  accent_color     text NOT NULL DEFAULT '#15803d',
  allow_signup     boolean NOT NULL DEFAULT true,
  certificate_footer text NOT NULL DEFAULT '',
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.platform_settings;
CREATE POLICY "Anyone can read settings"
  ON public.platform_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner can update settings" ON public.platform_settings;
CREATE POLICY "Owner can update settings"
  ON public.platform_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- ---------------------------------------------------------------
-- 5. جدول ads (إذا لم يكن موجوداً)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  image_url  text,
  link_url   text,
  placement  text NOT NULL DEFAULT 'home',
  position   integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active ads are public" ON public.ads;
CREATE POLICY "Active ads are public"
  ON public.ads FOR SELECT
  USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
DROP POLICY IF EXISTS "Staff can manage ads" ON public.ads;
CREATE POLICY "Staff can manage ads"
  ON public.ads FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','moderator')
  ));

-- ---------------------------------------------------------------
-- 6. جدول announcements (إذا لم يكن موجوداً)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  body       text NOT NULL,
  course_id  uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enrolled users can read announcements" ON public.announcements;
CREATE POLICY "Enrolled users can read announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    course_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE course_id = announcements.course_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
    )
  );
DROP POLICY IF EXISTS "Staff can manage announcements" ON public.announcements;
CREATE POLICY "Staff can manage announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));

-- ---------------------------------------------------------------
-- 7. جداول الاختبارات (quizzes / questions / quiz_attempts / attempt_answers)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quizzes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id           uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  title               text NOT NULL,
  description         text NOT NULL DEFAULT '',
  pass_score          integer NOT NULL DEFAULT 70,
  time_limit_minutes  integer NOT NULL DEFAULT 0,
  max_attempts        integer NOT NULL DEFAULT 3,
  shuffle             boolean NOT NULL DEFAULT false,
  show_answers        boolean NOT NULL DEFAULT true,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enrolled users can read quizzes" ON public.quizzes;
CREATE POLICY "Enrolled users can read quizzes"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE course_id = quizzes.course_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
    )
  );
DROP POLICY IF EXISTS "Staff can manage quizzes" ON public.quizzes;
CREATE POLICY "Staff can manage quizzes"
  ON public.quizzes FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));

CREATE TABLE IF NOT EXISTS public.questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  prompt         text NOT NULL,
  type           text NOT NULL DEFAULT 'mcq' CHECK (type IN ('mcq','true_false','short','essay')),
  options        jsonb NOT NULL DEFAULT '[]',
  correct_answer text,
  explanation    text,
  points         integer NOT NULL DEFAULT 1,
  position       integer NOT NULL DEFAULT 0
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Questions follow quiz access" ON public.questions;
CREATE POLICY "Questions follow quiz access"
  ON public.questions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.enrollments e ON e.course_id = q.course_id
    WHERE q.id = questions.quiz_id AND e.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));
DROP POLICY IF EXISTS "Staff can manage questions" ON public.questions;
CREATE POLICY "Staff can manage questions"
  ON public.questions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  course_id    uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score        integer NOT NULL DEFAULT 0,
  max_score    integer NOT NULL DEFAULT 0,
  passed       boolean NOT NULL DEFAULT false,
  status       text NOT NULL DEFAULT 'in_progress',
  ai_feedback  text,
  submitted_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own attempts" ON public.quiz_attempts;
CREATE POLICY "Users manage own attempts"
  ON public.quiz_attempts FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));

CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id     uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id    uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer         text,
  is_correct     boolean,
  awarded_points integer NOT NULL DEFAULT 0,
  ai_feedback    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own answers" ON public.attempt_answers;
CREATE POLICY "Users manage own answers"
  ON public.attempt_answers FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));

-- ---------------------------------------------------------------
-- 8. جدول reactions (إذا لم يكن موجوداً)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id  uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id  uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  kind       text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id, lesson_id, kind)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own reactions" ON public.reactions;
CREATE POLICY "Users manage own reactions"
  ON public.reactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Anyone can read reactions" ON public.reactions;
CREATE POLICY "Anyone can read reactions"
  ON public.reactions FOR SELECT USING (true);

-- ---------------------------------------------------------------
-- 9. إصلاح RLS على الجداول الأساسية
-- ---------------------------------------------------------------

-- courses: أي شخص يقرأ المنشور، المشرفون يديرون الكل
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read published courses" ON public.courses;
CREATE POLICY "Public can read published courses"
  ON public.courses FOR SELECT
  USING (status = 'published' OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));
DROP POLICY IF EXISTS "Staff can manage courses" ON public.courses;
CREATE POLICY "Staff can manage courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));

-- lessons: المسجلون يقرؤون
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enrolled or preview lessons" ON public.lessons;
CREATE POLICY "Enrolled or preview lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    is_preview = true
    OR EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE course_id = lessons.course_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
    )
  );
DROP POLICY IF EXISTS "Staff can manage lessons" ON public.lessons;
CREATE POLICY "Staff can manage lessons"
  ON public.lessons FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));

-- user_roles: المستخدم يقرأ دوره فقط
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;
CREATE POLICY "Users read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles r2
    WHERE r2.user_id = auth.uid() AND r2.role IN ('owner','moderator')
  ));
DROP POLICY IF EXISTS "Owner manages roles" ON public.user_roles;
CREATE POLICY "Owner manages roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles r2
    WHERE r2.user_id = auth.uid() AND r2.role = 'owner'
  ));

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile"
  ON public.profiles FOR ALL
  TO authenticated
  USING (id = auth.uid());
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT USING (true);

-- enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own enrollments" ON public.enrollments;
CREATE POLICY "Users manage own enrollments"
  ON public.enrollments FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','instructor','moderator')
  ));

-- lesson_progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own progress" ON public.lesson_progress;
CREATE POLICY "Users manage own progress"
  ON public.lesson_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------
-- 10. دالة verify_certificate إذا لم تكن موجودة
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE (code text, course_title text, full_name text, issued_at text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    c.code,
    cr.title  AS course_title,
    p.full_name,
    to_char(c.issued_at, 'YYYY-MM-DD') AS issued_at
  FROM public.certificates c
  JOIN public.courses cr ON cr.id = c.course_id
  JOIN public.profiles p ON p.id = c.user_id
  WHERE c.code = _code;
$$;

-- ---------------------------------------------------------------
-- 11. تسجيل صاحب الحساب كـ owner (استبدل EMAIL بإيميلك)
-- ---------------------------------------------------------------
-- قم بتشغيل هذا السطر يدوياً بعد معرفة UUID لحسابك:
-- INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'owner' FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
--   ON CONFLICT DO NOTHING;
