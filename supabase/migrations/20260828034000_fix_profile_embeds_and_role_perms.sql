-- إصلاح 1: التعليقات (qna_posts) وشهادات الإتمام (certificates) كانت تفشل عند
-- محاولة جلب اسم/صورة صاحب التعليق أو الشهادة عبر profiles:user_id(...) لأن
-- عمود user_id في هذين الجدولين يشير إلى auth.users فقط، وليس هناك علاقة مباشرة
-- إلى public.profiles يستطيع PostgREST اكتشافها لعمل "join" ضمني. كل مستخدم لديه
-- صف مطابق في profiles (يُنشأ تلقائياً عبر handle_new_user)، لذا إضافة مفتاح أجنبي
-- إضافي آمنة ولا تكرر أي بيانات.
ALTER TABLE public.qna_posts
  ADD CONSTRAINT qna_posts_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- إصلاح 2: تعديل صلاحيات المستخدمين (user_roles) كان يفشل لأن صلاحية GRANT على
-- مستوى قاعدة البيانات لم تكن تشمل INSERT/UPDATE في الهجرة الأصلية. هذا يعيد
-- تأكيد الصلاحيات وسياسة "المالك فقط يدير الأدوار" بشكل صريح وآمن لإعادة التطبيق.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS "owner manage roles" ON public.user_roles;
CREATE POLICY "owner manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- إعادة تحميل مخبأ PostgREST كي تُطبَّق التغييرات فوراً بدون انتظار إعادة تشغيل.
NOTIFY pgrst, 'reload schema';
