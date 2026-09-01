import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  getLocaleMeta,
  isValidLocale,
  translations,
  type Locale,
} from "@/lib/i18n";

const STORAGE_KEY = "tadreeb-locale";

interface I18nContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function applyDocumentDirection(locale: Locale) {
  if (typeof document === "undefined") return;
  const meta = getLocaleMeta(locale);
  document.documentElement.setAttribute("lang", locale === "ckb" ? "ckb" : locale);
  document.documentElement.setAttribute("dir", meta.dir);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // عند التحميل بالمتصفح: نقرأ التفضيل المحفوظ ونطبّق الاتجاه فورًا (بعد الهدرة لتفادي أي
  // تعارض بين ما يرسمه الخادم وأول رسم بالمتصفح).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isValidLocale(stored)) {
      setLocaleState(stored);
      applyDocumentDirection(stored);
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyDocumentDirection(next);
  };

  const value = useMemo<I18nContextValue>(() => {
    const dict = translations[locale];
    return {
      locale,
      dir: getLocaleMeta(locale).dir,
      setLocale,
      t: (key: string) => dict[key] ?? translations[DEFAULT_LOCALE][key] ?? key,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
