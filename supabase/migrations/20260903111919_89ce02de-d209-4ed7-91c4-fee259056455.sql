CREATE POLICY "course media authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'course-media');

CREATE POLICY "course media anon read covers"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'course-media' AND name LIKE 'covers/%');