
-- Phase 15: durcir les fonctions SECURITY DEFINER (retirer l'accès anonyme)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_finance(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_school_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.same_school(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.teacher_teaches_class(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.teacher_teaches_student(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.same_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_teaches_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_teaches_student(uuid, uuid) TO authenticated;
