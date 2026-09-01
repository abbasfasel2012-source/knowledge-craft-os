import { Link, useLocation } from "@tanstack/react-router";
import { History, Home, User } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const { t } = useI18n();

  const sideItem =
    "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-all duration-200 active:scale-90";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-end justify-around px-2">
        <Link
          to="/record"
          className={`${sideItem} ${path.startsWith("/record") ? "text-gold" : "text-muted-foreground"}`}
        >
          <History className="h-5 w-5" />
          <span>{t("nav_record")}</span>
        </Link>

        <Link to="/" className="flex flex-1 flex-col items-center gap-1 pb-2">
          <div
            className={`-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background shadow-[var(--shadow-soft)] transition-all duration-200 active:scale-90 ${
              path === "/" ? "gold-gradient" : "bg-card border-border"
            }`}
          >
            <Home
              className={`h-6 w-6 transition-transform duration-200 ${path === "/" ? "text-gold-foreground scale-105" : "text-muted-foreground"}`}
            />
          </div>
          <span
            className={`text-[11px] font-semibold transition-colors duration-200 ${path === "/" ? "text-gold" : "text-muted-foreground"}`}
          >
            {t("nav_home")}
          </span>
        </Link>

        <Link
          to="/profile"
          className={`${sideItem} ${path.startsWith("/profile") ? "text-gold" : "text-muted-foreground"}`}
        >
          <User className="h-5 w-5" />
          <span>{t("nav_profile")}</span>
        </Link>
      </div>
    </nav>
  );
}
