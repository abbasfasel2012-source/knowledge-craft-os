DROP VIEW IF EXISTS public.lessons_catalog;
DROP VIEW IF EXISTS public.quiz_questions_view;

-- Questions: visible to enrolled students and course staff only, and the
-- answer key columns are never readable through the API.
DROP POLICY IF EXISTS "questions read" ON public.questions;
CREATE POLICY "questions read" ON public.questions FOR SELECT
USING (
  public.can_edit_course(public.quiz_course(quiz_id), auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.quizzes z
    JOIN public.enrollments e ON e.course_id = z.course_id
    WHERE z.id = questions.quiz_id AND e.user_id = auth.uid()
  )
);

REVOKE SELECT ON public.questions FROM anon, authenticated;
GRANT SELECT (id, quiz_id, type, prompt, options, points, position)
  ON public.questions TO authenticated;

-- Internal SECURITY DEFINER helpers/triggers must not be callable from the API
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_course(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.course_visible(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.quiz_course(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grade_attempt_answer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_quiz_attempt() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resync_attempt_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_issue_certificate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_award_badges() FROM PUBLIC, anon, authenticated;