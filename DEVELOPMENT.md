# مِرقاة — منصة التدريب العربية

## نطاق التطوير

هذا المشروع يستخدم إعدادات التطوير التالية:

### بيئة التطوير

- **Node.js**: 18+
- **Package Manager**: npm / yarn / bun
- **Runtime**: Vite 5+

### أساليب البرمجة

- **Type Safety**: TypeScript 5+
- **UI Framework**: React 19+
- **Routing**: TanStack Router 1.170+
- **State Management**: TanStack Query 5+
- **Styling**: Tailwind CSS 4+
- **Backend**: Supabase

### أدوات التطوير

- **Linting**: ESLint 9+
- **Formatting**: Prettier 3+
- **Package Manager**: Bun (مفضل)

---

## قواعد الأسلوب

### التسمية

- **Components**: PascalCase (`CourseCard.tsx`)
- **Functions**: camelCase (`trackEvent`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Files**: kebab-case أو PascalCase حسب النوع

### البنية

```
✅ استخدم functional components مع hooks
✅ فصل الـ logic عن الـ UI
✅ استخدم custom hooks للـ shared logic
❌ تجنب class components
❌ لا تستخدم prop drilling
```

### الأداء

```
✅ استخدم React.memo للـ components الثقيلة
✅ استخدم useCallback للـ functions
✅ استخدم useMemo للـ computations
✅ lazy load الـ routes و components
❌ لا تنسَ تنظيف الـ side effects
```

---

## فروع Git

```
main
├── feat/complete-platform-redesign (التطوير الحالي)
├── feat/* (ميزات جديدة)
├── fix/* (إصلاحات الأخطاء)
├── docs/* (توثيق)
└── chore/* (صيانة)
```

### نمط الـ Commit

```
type(scope): description

type: feat, fix, docs, style, refactor, perf, test, chore
scope: auth, course, video, admin, etc.
description: وصف واضح قصير
```

---

## متطلبات الـ PR

- ✅ فحص ESLint بنجاح
- ✅ تنسيق Prettier صحيح
- ✅ أنواع TypeScript صحيحة
- ✅ اختبارات (عند الإمكان)
- ✅ توثيق التغييرات

---

## إرشادات التطوير

### إضافة ميزة جديدة

```bash
# 1. إنشاء فرع جديد
git checkout -b feat/feature-name

# 2. التطوير
npm run dev

# 3. الاختبار
npm run build
npm run lint

# 4. الـ Commit
git add .
git commit -m "feat(scope): add amazing feature"

# 5. Push و PR
git push origin feat/feature-name
```

### إصلاح خطأ

```bash
git checkout -b fix/bug-name
# ... إصلاح الخطأ
git commit -m "fix(scope): fix critical bug"
```

---

## الموارد المرجعية

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [React Query Docs](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Happy Coding! 🚀**
