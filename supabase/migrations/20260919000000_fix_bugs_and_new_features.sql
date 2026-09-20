-- ═══════════════════════════════════════════════════════════════════
-- إصلاح الأخطاء وإضافة الميزات الجديدة - 2026-09-19
-- ═══════════════════════════════════════════════════════════════════

-- 1. إنشاء دالة update_my_profile (كانت في الأنواع لكن غير موجودة في قاعدة البيانات)
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_full_name text,
  p_avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    full_name  = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
    avatar_url = p_avatar_url
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text) TO authenticated;

-- 2. جدول qna_likes (إعجابات التعليقات)
CREATE TABLE IF NOT EXISTS public.qna_likes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qna_post_id  uuid NOT NULL REFERENCES public.qna_posts(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (qna_post_id, user_id)
);

ALTER TABLE public.qna_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qna_likes read"       ON public.qna_likes;
DROP POLICY IF EXISTS "qna_likes insert own" ON public.qna_likes;
DROP POLICY IF EXISTS "qna_likes delete own" ON public.qna_likes;

CREATE POLICY "qna_likes read"
  ON public.qna_likes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "qna_likes insert own"
  ON public.qna_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "qna_likes delete own"
  ON public.qna_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.qna_likes TO authenticated;
GRANT SELECT                  ON public.qna_likes TO anon;

-- 3. إضافة عمود ai_feedback في attempt_answers لتخزين تعليق الذكاء الاصطناعي
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'attempt_answers'
      AND column_name  = 'ai_feedback'
  ) THEN
    ALTER TABLE public.attempt_answers ADD COLUMN ai_feedback text;
  END IF;
END $$;

-- 4. إضافة عمود ai_grade_context في questions للتصحيح الذكي
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'questions'
      AND column_name  = 'ai_grade_context'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN ai_grade_context text;
  END IF;
END $$;

-- 5. إنشاء quiz_questions_view إن لم تكن موجودة (تجمع questions مع quiz_id بشكل مريح)
CREATE OR REPLACE VIEW public.quiz_questions_view AS
SELECT
  q.id,
  q.quiz_id,
  q.type,
  q.prompt,
  q.options,
  q.correct_answer,
  q.explanation,
  q.ai_grade_context,
  q.points,
  q.position
FROM public.questions q;

GRANT SELECT ON public.quiz_questions_view TO authenticated, anon;

-- 6. إصلاح saved_items: التأكد من وجود سياسة RLS للإدراج/القراءة/الحذف
DROP POLICY IF EXISTS "saved_items read own"   ON public.saved_items;
DROP POLICY IF EXISTS "saved_items insert own" ON public.saved_items;
DROP POLICY IF EXISTS "saved_items delete own" ON public.saved_items;

CREATE POLICY "saved_items read own"
  ON public.saved_items FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "saved_items insert own"
  ON public.saved_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_items delete own"
  ON public.saved_items FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 7. إصلاح reactions: التأكد من سياسات RLS
DROP POLICY IF EXISTS "reactions read"       ON public.reactions;
DROP POLICY IF EXISTS "reactions insert own" ON public.reactions;
DROP POLICY IF EXISTS "reactions delete own" ON public.reactions;

CREATE POLICY "reactions read"
  ON public.reactions FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "reactions insert own"
  ON public.reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions delete own"
  ON public.reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════
-- إضافة نوع "audio" لـ lesson_type إن لم يكن موجوداً
-- ═══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  -- نحاول إضافة القيمة؛ يُتجاهل الخطأ إن كانت موجودة مسبقاً
  ALTER TYPE public.lesson_type ADD VALUE IF NOT EXISTS 'audio';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
