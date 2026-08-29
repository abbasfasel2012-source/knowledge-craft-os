CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','instructor','moderator'));
$$;

CREATE OR REPLACE FUNCTION private.can_edit_course(_course_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.has_role(_user_id,'owner')
      OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.instructor_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION private.course_visible(_course_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id
    AND (c.status = 'published' OR c.instructor_id = _user_id OR private.has_role(_user_id,'owner')));
$$;

CREATE OR REPLACE FUNCTION private.quiz_course(_quiz_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT course_id FROM public.quizzes WHERE id = _quiz_id;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO anon, authenticated, service_role;

DO $do$
DECLARE
  r record;
  q text;
  w text;
  cmd text;
  roles text;
BEGIN
  FOR r IN
    SELECT p.schemaname, p.tablename, p.policyname, p.cmd, p.qual, p.with_check, p.permissive, p.roles
    FROM pg_policies p
    WHERE p.schemaname IN ('public','storage')
      AND (coalesce(p.qual,'') || coalesce(p.with_check,'')) ~ '(has_role|is_staff|can_edit_course|course_visible|quiz_course)\('
      AND (coalesce(p.qual,'') || coalesce(p.with_check,'')) !~ 'private\.'
  LOOP
    q := regexp_replace(regexp_replace(coalesce(r.qual,''), '(^|[^.\w])(public\.)?(has_role|is_staff|can_edit_course|course_visible|quiz_course)\(', '\1private.\3(', 'g'), '(^|[^.\w])(public\.)?(has_role|is_staff|can_edit_course|course_visible|quiz_course)\(', '\1private.\3(', 'g');
    w := regexp_replace(regexp_replace(coalesce(r.with_check,''), '(^|[^.\w])(public\.)?(has_role|is_staff|can_edit_course|course_visible|quiz_course)\(', '\1private.\3(', 'g'), '(^|[^.\w])(public\.)?(has_role|is_staff|can_edit_course|course_visible|quiz_course)\(', '\1private.\3(', 'g');
    roles := array_to_string(r.roles, ', ');
    cmd := format('DROP POLICY %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
    EXECUTE cmd;
    cmd := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename,
      CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      r.cmd, roles);
    IF r.qual IS NOT NULL THEN cmd := cmd || format(' USING (%s)', q); END IF;
    IF r.with_check IS NOT NULL THEN cmd := cmd || format(' WITH CHECK (%s)', w); END IF;
    EXECUTE cmd;
  END LOOP;
END
$do$;

CREATE OR REPLACE FUNCTION public.grade_attempt_answer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.questions%ROWTYPE;
BEGIN
  SELECT * INTO q FROM public.questions WHERE id = NEW.question_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'question not found'; END IF;
  IF private.is_staff(auth.uid()) THEN RETURN NEW; END IF;
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

CREATE OR REPLACE FUNCTION public.recalc_quiz_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s numeric; m numeric; ps int;
BEGIN
  IF private.is_staff(auth.uid()) THEN RETURN NEW; END IF;
  SELECT coalesce(sum(a.awarded_points),0) INTO s FROM public.attempt_answers a WHERE a.attempt_id = NEW.id;
  SELECT coalesce(sum(q.points),0) INTO m FROM public.questions q WHERE q.quiz_id = NEW.quiz_id;
  SELECT z.pass_score INTO ps FROM public.quizzes z WHERE z.id = NEW.quiz_id;
  NEW.score := s; NEW.max_score := m;
  NEW.passed := (m > 0 AND (s * 100.0 / m) >= coalesce(ps, 60));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.protect_profile_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.points IS DISTINCT FROM OLD.points AND NOT private.has_role(auth.uid(), 'owner') THEN
    NEW.points := OLD.points;
  END IF;
  RETURN NEW;
END; $$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(uuid);
DROP FUNCTION IF EXISTS public.can_edit_course(uuid, uuid);
DROP FUNCTION IF EXISTS public.course_visible(uuid, uuid);
DROP FUNCTION IF EXISTS public.quiz_course(uuid);