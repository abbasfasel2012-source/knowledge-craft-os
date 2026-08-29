-- 1) LESSONS: enrollment-gated content
DROP POLICY IF EXISTS "lessons read" ON public.lessons;
CREATE POLICY "lessons read" ON public.lessons FOR SELECT
USING (
  public.course_visible(course_id, auth.uid())
  AND (
    is_preview
    OR public.can_edit_course(course_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = lessons.course_id AND e.user_id = auth.uid())
  )
);

CREATE OR REPLACE VIEW public.lessons_catalog WITH (security_invoker = off) AS
SELECT l.id, l.course_id, l.section_id, l.title, l.type, l.duration_minutes,
       l.position, l.is_preview, l.summary
FROM public.lessons l
JOIN public.courses c ON c.id = l.course_id
WHERE c.status = 'published'
   OR c.instructor_id = auth.uid()
   OR public.has_role(auth.uid(), 'owner');
GRANT SELECT ON public.lessons_catalog TO anon, authenticated;

-- 2) QUESTIONS: answer key staff-only; students read a safe view
DROP POLICY IF EXISTS "questions read" ON public.questions;
CREATE POLICY "questions read" ON public.questions FOR SELECT
USING (public.can_edit_course(public.quiz_course(quiz_id), auth.uid()));

CREATE OR REPLACE VIEW public.quiz_questions_view WITH (security_invoker = off) AS
SELECT q.id, q.quiz_id, q.type, q.prompt, q.options, q.points, q.position
FROM public.questions q
JOIN public.quizzes z ON z.id = q.quiz_id
WHERE public.can_edit_course(z.course_id, auth.uid())
   OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = z.course_id AND e.user_id = auth.uid());
GRANT SELECT ON public.quiz_questions_view TO authenticated;

-- 3) SERVER-SIDE GRADING
CREATE OR REPLACE FUNCTION public.grade_attempt_answer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.questions%ROWTYPE;
BEGIN
  SELECT * INTO q FROM public.questions WHERE id = NEW.question_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'question not found'; END IF;
  IF public.is_staff(auth.uid()) THEN RETURN NEW; END IF;
  IF q.type IN ('mcq','true_false','short') THEN
    NEW.is_correct := (q.correct_answer IS NOT NULL
      AND lower(btrim(coalesce(NEW.answer,''))) = lower(btrim(q.correct_answer)));
    NEW.awarded_points := CASE WHEN NEW.is_correct THEN q.points ELSE 0 END;
  ELSE
    NEW.is_correct := NULL;
    NEW.awarded_points := 0;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS attempt_answers_grade ON public.attempt_answers;
CREATE TRIGGER attempt_answers_grade BEFORE INSERT OR UPDATE ON public.attempt_answers
FOR EACH ROW EXECUTE FUNCTION public.grade_attempt_answer();

CREATE OR REPLACE FUNCTION public.recalc_quiz_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s numeric; m numeric; ps int;
BEGIN
  IF public.is_staff(auth.uid()) THEN RETURN NEW; END IF;
  SELECT coalesce(sum(a.awarded_points),0) INTO s
    FROM public.attempt_answers a WHERE a.attempt_id = NEW.id;
  SELECT coalesce(sum(q.points),0) INTO m
    FROM public.questions q WHERE q.quiz_id = NEW.quiz_id;
  SELECT z.pass_score INTO ps FROM public.quizzes z WHERE z.id = NEW.quiz_id;
  NEW.score := s;
  NEW.max_score := m;
  NEW.passed := (m > 0 AND (s * 100.0 / m) >= coalesce(ps, 60));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS quiz_attempts_recalc ON public.quiz_attempts;
CREATE TRIGGER quiz_attempts_recalc BEFORE INSERT OR UPDATE ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.recalc_quiz_attempt();

CREATE OR REPLACE FUNCTION public.resync_attempt_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s numeric; m numeric; ps int; att public.quiz_attempts%ROWTYPE;
BEGIN
  SELECT * INTO att FROM public.quiz_attempts WHERE id = NEW.attempt_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT coalesce(sum(a.awarded_points),0) INTO s
    FROM public.attempt_answers a WHERE a.attempt_id = NEW.attempt_id;
  SELECT coalesce(sum(q.points),0) INTO m FROM public.questions q WHERE q.quiz_id = att.quiz_id;
  SELECT z.pass_score INTO ps FROM public.quizzes z WHERE z.id = att.quiz_id;
  UPDATE public.quiz_attempts
     SET score = s, max_score = m,
         passed = (m > 0 AND (s * 100.0 / m) >= coalesce(ps, 60))
   WHERE id = NEW.attempt_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS attempt_answers_resync ON public.attempt_answers;
CREATE TRIGGER attempt_answers_resync AFTER INSERT OR UPDATE ON public.attempt_answers
FOR EACH ROW EXECUTE FUNCTION public.resync_attempt_score();

-- 4) CERTIFICATES: no client inserts, auto-issue on real completion
DROP POLICY IF EXISTS "certificates insert own" ON public.certificates;
REVOKE INSERT, UPDATE, DELETE ON public.certificates FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.auto_issue_certificate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE enabled boolean;
BEGIN
  IF NEW.completed_at IS NULL THEN RETURN NEW; END IF;
  SELECT c.certificate_enabled INTO enabled FROM public.courses c WHERE c.id = NEW.course_id;
  IF NOT coalesce(enabled, false) THEN RETURN NEW; END IF;
  INSERT INTO public.certificates (user_id, course_id, code)
  SELECT NEW.user_id, NEW.course_id, upper(replace(gen_random_uuid()::text, '-', ''))
  WHERE NOT EXISTS (
    SELECT 1 FROM public.certificates ce
     WHERE ce.user_id = NEW.user_id AND ce.course_id = NEW.course_id
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enrollments_issue_certificate ON public.enrollments;
CREATE TRIGGER enrollments_issue_certificate AFTER INSERT OR UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.auto_issue_certificate();

-- 5) BADGES + POINTS: no self-awarding
DROP POLICY IF EXISTS "user badges insert" ON public.user_badges;
REVOKE INSERT, UPDATE, DELETE ON public.user_badges FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.protect_profile_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.points IS DISTINCT FROM OLD.points AND NOT public.has_role(auth.uid(), 'owner') THEN
    NEW.points := OLD.points;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_protect_points ON public.profiles;
CREATE TRIGGER profiles_protect_points BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_points();

CREATE OR REPLACE FUNCTION public.auto_award_badges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id)
  SELECT NEW.id, b.id FROM public.badges b
   WHERE b.points_required <= NEW.points
     AND NOT EXISTS (
       SELECT 1 FROM public.user_badges ub WHERE ub.user_id = NEW.id AND ub.badge_id = b.id
     );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_award_badges ON public.profiles;
CREATE TRIGGER profiles_award_badges AFTER INSERT OR UPDATE OF points ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_award_badges();

-- 6) Internal SECURITY DEFINER helpers are not directly callable from the API
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_course(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.course_visible(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.quiz_course(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;