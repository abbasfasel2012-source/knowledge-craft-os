-- توحيد صلاحيات إدارة المحتوى والوسائط.
-- تعتمد كل العمليات على دوال SECURITY DEFINER لتفادي تكرار سياسات RLS.

CREATE OR REPLACE FUNCTION public.can_manage_catalog(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'instructor', 'moderator')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_course(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'owner')
      OR public.has_role(_user_id, 'moderator')
      OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = _course_id AND c.instructor_id = _user_id
      );
$$;

REVOKE ALL ON FUNCTION public.can_manage_catalog(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_catalog(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_edit_course(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_course(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "courses insert staff" ON public.courses;
DROP POLICY IF EXISTS "courses update own" ON public.courses;
DROP POLICY IF EXISTS "courses delete own" ON public.courses;
CREATE POLICY "courses insert catalog managers"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_catalog(auth.uid())
    AND instructor_id = auth.uid()
  );
CREATE POLICY "courses update catalog managers"
  ON public.courses FOR UPDATE TO authenticated
  USING (public.can_edit_course(id, auth.uid()))
  WITH CHECK (public.can_edit_course(id, auth.uid()));
CREATE POLICY "courses delete catalog managers"
  ON public.courses FOR DELETE TO authenticated
  USING (public.can_edit_course(id, auth.uid()));

DROP POLICY IF EXISTS "lessons write" ON public.lessons;
CREATE POLICY "lessons catalog managers write"
  ON public.lessons FOR ALL TO authenticated
  USING (public.can_edit_course(course_id, auth.uid()))
  WITH CHECK (public.can_edit_course(course_id, auth.uid()));

-- إزالة أي اختلاف بين أسماء سياسات التخزين التي أضيفت في الهجرات السابقة.
DROP POLICY IF EXISTS "Staff can upload course media" ON storage.objects;
DROP POLICY IF EXISTS "course media staff upload" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update course media" ON storage.objects;
DROP POLICY IF EXISTS "course media staff update" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete course media" ON storage.objects;
DROP POLICY IF EXISTS "course media staff delete" ON storage.objects;
CREATE POLICY "course media catalog managers upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-media' AND public.can_manage_catalog(auth.uid()));
CREATE POLICY "course media catalog managers update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-media' AND public.can_manage_catalog(auth.uid()))
  WITH CHECK (bucket_id = 'course-media' AND public.can_manage_catalog(auth.uid()));
CREATE POLICY "course media catalog managers delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-media' AND public.can_manage_catalog(auth.uid()));

-- منع تضارب السياسات القديمة مع سياسة القراءة الموحدة.
DROP POLICY IF EXISTS "course media staff read" ON storage.objects;
DROP POLICY IF EXISTS "course media authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read course media" ON storage.objects;
CREATE POLICY "course media authenticated signed read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-media');

-- تحديث updated_at مضمون عند تعديل المحتوى.
DROP TRIGGER IF EXISTS lessons_updated ON public.lessons;
CREATE TRIGGER lessons_updated
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS courses_updated ON public.courses;
CREATE TRIGGER courses_updated
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
