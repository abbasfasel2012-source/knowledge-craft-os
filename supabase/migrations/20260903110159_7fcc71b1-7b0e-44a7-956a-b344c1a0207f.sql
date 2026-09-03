-- 1. Certificates: no public enumeration; verification via code-only function
DROP POLICY IF EXISTS "certificates public verify" ON public.certificates;
DROP POLICY IF EXISTS "certificates read own or staff" ON public.certificates;
CREATE POLICY "certificates read own or staff" ON public.certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_staff(auth.uid()));
REVOKE SELECT ON public.certificates FROM anon;

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE (code text, issued_at timestamptz, full_name text, course_title text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.code, c.issued_at, p.full_name, co.title
  FROM public.certificates c
  JOIN public.profiles p ON p.id = c.user_id
  JOIN public.courses co ON co.id = c.course_id
  WHERE c.code = upper(trim(_code))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 2. Questions: never expose the answer key to non-staff
REVOKE SELECT (correct_answer, explanation) ON public.questions FROM anon, authenticated;
GRANT SELECT (id, quiz_id, type, prompt, options, points, position) ON public.questions TO authenticated;

-- 3. Enrollments: students cannot self-set progress/completed_at
CREATE OR REPLACE FUNCTION public.guard_enrollment_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.can_edit_course(NEW.course_id, auth.uid()) THEN
    NEW.progress := OLD.progress;
    NEW.completed_at := OLD.completed_at;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_enrollment_progress_trg ON public.enrollments;
CREATE TRIGGER guard_enrollment_progress_trg
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.guard_enrollment_progress();

CREATE OR REPLACE FUNCTION public.recompute_enrollment_progress(_course_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _total int;
  _done int;
  _progress int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT count(*) INTO _total FROM public.lessons WHERE course_id = _course_id;
  SELECT count(*) INTO _done FROM public.lesson_progress
    WHERE course_id = _course_id AND user_id = _uid AND completed;

  _progress := CASE WHEN _total > 0 THEN least(100, round((_done::numeric / _total) * 100)) ELSE 0 END;

  UPDATE public.enrollments
    SET progress = _progress,
        completed_at = CASE WHEN _progress >= 100 THEN coalesce(completed_at, now()) ELSE NULL END
  WHERE course_id = _course_id AND user_id = _uid;

  RETURN _progress;
END;
$$;
REVOKE ALL ON FUNCTION public.recompute_enrollment_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_enrollment_progress(uuid) TO authenticated;

-- 4. Storage: no public read of course media; staff only (students use signed URLs)
DROP POLICY IF EXISTS "course media public read" ON storage.objects;
DROP POLICY IF EXISTS "course media read" ON storage.objects;
DROP POLICY IF EXISTS "course media staff read" ON storage.objects;
CREATE POLICY "course media staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-media' AND private.is_staff(auth.uid()));