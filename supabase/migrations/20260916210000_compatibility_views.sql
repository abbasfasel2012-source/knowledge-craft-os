-- Compatibility views for the account project, whose existing Tadreeb tables
-- use a tadreeb_ prefix while the application contract uses neutral names.
-- These views preserve the existing data and keep RLS enforced on base tables.
CREATE OR REPLACE VIEW public.profiles WITH (security_invoker = true) AS
SELECT * FROM public.tadreeb_profiles;

CREATE OR REPLACE VIEW public.sections WITH (security_invoker = true) AS
SELECT * FROM public.tadreeb_sections;

CREATE OR REPLACE VIEW public.lessons WITH (security_invoker = true) AS
SELECT * FROM public.tadreeb_lessons;

CREATE OR REPLACE VIEW public.enrollments WITH (security_invoker = true) AS
SELECT * FROM public.tadreeb_enrollments;

CREATE OR REPLACE VIEW public.certificates WITH (security_invoker = true) AS
SELECT * FROM public.tadreeb_certificates;

CREATE OR REPLACE VIEW public.reviews WITH (security_invoker = true) AS
SELECT * FROM public.tadreeb_reviews;

CREATE OR REPLACE VIEW public.lesson_progress WITH (security_invoker = true) AS
SELECT * FROM public.tadreeb_lesson_progress;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.profiles, public.sections, public.lessons, public.enrollments,
   public.certificates, public.reviews, public.lesson_progress
TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
