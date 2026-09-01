import { LOCALES } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-context";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground">{t("language")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={`interactive-card rounded-lg border px-3 py-2.5 text-sm font-semibold ${
              locale === l.code
                ? "border-gold bg-gold/10 text-gold"
                : "border-border bg-background text-foreground"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{t("language_hint")}</p>
    </div>
  );
}
