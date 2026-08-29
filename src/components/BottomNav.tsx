import { Link, useLocation } from "@tanstack/react-router";
import { History, Home, User } from "lucide-react";

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  const sideItem =
    "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-colors";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-end justify-around px-2">
        <Link
          to="/record"
          className={`${sideItem} ${path.startsWith("/record") ? "text-gold" : "text-muted-foreground"}`}
        >
          <History className="h-5 w-5" />
          <span>السجل</span>
        </Link>

        <Link to="/" className="flex flex-1 flex-col items-center gap-1 pb-2">
          <div
            className={`-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background shadow-[var(--shadow-soft)] ${
              path === "/" ? "gold-gradient" : "bg-card border-border"
            }`}
          >
            <Home
              className={`h-6 w-6 ${path === "/" ? "text-gold-foreground" : "text-muted-foreground"}`}
            />
          </div>
          <span
            className={`text-[11px] font-semibold ${path === "/" ? "text-gold" : "text-muted-foreground"}`}
          >
            الرئيسية
          </span>
        </Link>

        <Link
          to="/profile"
          className={`${sideItem} ${path.startsWith("/profile") ? "text-gold" : "text-muted-foreground"}`}
        >
          <User className="h-5 w-5" />
          <span>الملف</span>
        </Link>
      </div>
    </nav>
  );
}
