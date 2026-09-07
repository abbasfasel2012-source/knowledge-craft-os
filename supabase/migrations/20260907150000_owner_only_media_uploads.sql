-- حصر رفع وتعديل وحذف ملفات المنصة في المالك فقط.
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "course media catalog managers upload" ON storage.objects;
DROP POLICY IF EXISTS "course media catalog managers update" ON storage.objects;
DROP POLICY IF EXISTS "course media catalog managers delete" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload course media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update course media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete course media" ON storage.objects;
DROP POLICY IF EXISTS "course media staff upload" ON storage.objects;
DROP POLICY IF EXISTS "course media staff update" ON storage.objects;
DROP POLICY IF EXISTS "course media staff delete" ON storage.objects;

CREATE POLICY "owner only course media upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-media' AND public.is_owner(auth.uid()));
CREATE POLICY "owner only course media update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-media' AND public.is_owner(auth.uid()))
  WITH CHECK (bucket_id = 'course-media' AND public.is_owner(auth.uid()));
CREATE POLICY "owner only course media delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-media' AND public.is_owner(auth.uid()));

NOTIFY pgrst, 'reload schema';
