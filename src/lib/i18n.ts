// نظام تعدد اللغات: عربي / كردي سوراني (حروف عربية) / تركمانية (حروف لاتينية) / إنجليزية
// مع تبديل اتجاه تلقائي كامل (RTL/LTR) حسب اللغة المختارة.

export type Locale = "ar" | "ckb" | "tk" | "en";

export interface LocaleMeta {
  code: Locale;
  label: string; // الاسم بلغته الأصلية، يظهر بقائمة اختيار اللغة
  dir: "rtl" | "ltr";
}

export const LOCALES: LocaleMeta[] = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "ckb", label: "کوردیی سۆرانی", dir: "rtl" },
  { code: "tk", label: "Türkmençe", dir: "ltr" },
  { code: "en", label: "English", dir: "ltr" },
];

export const DEFAULT_LOCALE: Locale = "ar";

export function getLocaleMeta(locale: Locale): LocaleMeta {
  return LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
}

export function isValidLocale(value: string | null): value is Locale {
  return !!value && LOCALES.some((l) => l.code === value);
}

// قاموس عناصر الواجهة العامة (Chrome): شريط التنقل، رأس الصفحة، الإعدادات، إلخ.
// ملاحظة نطاق العمل: هذه المرحلة تغطي عناصر الواجهة المشتركة وليس كامل محتوى كل صفحة —
// ترجمة كل نص بكل صفحة عمل إضافي أكبر يمكن إتمامه تباعًا فوق هذا الأساس.
export const translations: Record<Locale, Record<string, string>> = {
  ar: {
    nav_home: "الرئيسية",
    nav_record: "السجل",
    nav_profile: "الملف",
    welcome_to: "أهلاً بك في",
    app_name: "تدريب",
    login: "دخول",
    logout: "تسجيل الخروج",
    settings: "الإعدادات",
    language: "اللغة",
    language_hint: "تُطبَّق فورًا مع تغيير اتجاه الواجهة تلقائيًا",
  },
  ckb: {
    nav_home: "سەرەکی",
    nav_record: "تۆمار",
    nav_profile: "پرۆفایل",
    welcome_to: "بەخێربێیت بۆ",
    app_name: "ڕاهێنان",
    login: "چوونەژوورەوە",
    logout: "چوونەدەرەوە",
    settings: "ڕێکخستنەکان",
    language: "زمان",
    language_hint: "دەستبەجێ جێبەجێ دەکرێت لەگەڵ گۆڕینی ئاراستەی ڕووکار بەخۆکار",
  },
  tk: {
    nav_home: "Baş sahypa",
    nav_record: "Taryh",
    nav_profile: "Profil",
    welcome_to: "Hoş geldiňiz",
    app_name: "Tedrip",
    login: "Girmek",
    logout: "Çykmak",
    settings: "Sazlamalar",
    language: "Dil",
    language_hint: "Ekran ugry dile görä awtomatik üýtgeýär",
  },
  en: {
    nav_home: "Home",
    nav_record: "History",
    nav_profile: "Profile",
    welcome_to: "Welcome to",
    app_name: "Tadreeb",
    login: "Log in",
    logout: "Log out",
    settings: "Settings",
    language: "Language",
    language_hint: "Applies instantly and switches the layout direction automatically",
  },
};
