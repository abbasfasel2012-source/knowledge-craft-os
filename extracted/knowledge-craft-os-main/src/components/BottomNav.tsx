import { Link, useLocation } from "@tanstack/react-router";
import { Home, User } from "lucide-react";
import { useSession } from "@/lib/session";

export function BottomNav() {
  const location = useLocation();
  const { user } = useSession();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        <Link
          to="/"
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors ${
            isActive("/") && location.pathname === "/"
              ? "gold-gradient text-gold-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          <span>الرئيسية</span>
        </Link>

        <div className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground">
          <div className="relative">
            <div className="absolute inset-0 h-6 w-6 rounded-full gold-gradient opacity-20" />
            <div className="relative h-6 w-6 rounded-full border-2 border-gold bg-card" />
          </div>
          <span className="text-[10px]">مِرقاة</span>
        </div>

        <Link
          to={user ? "/profile" : "/auth"}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors ${
            isActive("/profile")
              ? "gold-gradient text-gold-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-5 w-5" />
          <span>ملفي</span>
        </Link>
      </div>

      {/* Secondary nav for records */}
      {user && location.pathname === "/profile" && (
        <div className="border-t border-border bg-background px-4 py-2">
          <div className="flex gap-2 text-xs">
            <button className="rounded-full border border-gold bg-card px-3 py-1 font-semibold text-gold transition-colors hover:bg-gold/10">
              السجلات
            </button>
            <button className="rounded-full border border-border px-3 py-1 font-semibold text-muted-foreground transition-colors hover:bg-card">
              الشهادات
            </button>
            <button className="rounded-full border border-border px-3 py-1 font-semibold text-muted-foreground transition-colors hover:bg-card">
              الباجات
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
