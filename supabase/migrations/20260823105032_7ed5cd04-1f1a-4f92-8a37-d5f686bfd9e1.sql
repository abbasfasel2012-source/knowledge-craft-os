
CREATE POLICY "course media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-media');
CREATE POLICY "course media staff upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-media' AND public.is_staff(auth.uid()));
CREATE POLICY "course media staff update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-media' AND public.is_staff(auth.uid()));
CREATE POLICY "course media staff delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-media' AND public.is_staff(auth.uid()));
