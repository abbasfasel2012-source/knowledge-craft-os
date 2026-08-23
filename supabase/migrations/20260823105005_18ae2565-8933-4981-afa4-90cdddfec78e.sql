
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_course(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_course(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_course(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_course(uuid) TO authenticated;
