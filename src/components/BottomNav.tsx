import { Link, useRouterState } from "@tanstack/react-router";
import { History, User, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/auth")) return null;

  const side = [
    { to: "/record", label: "السجل", icon: History },
    { to: "/profile", label: "الملف", icon: User },
  ] as const;

  const isHome = pathname === "/";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 safe-bottom">
      <div className="mx-auto max-w-lg px-4 pb-2">
        <div className="relative flex h-16 items-center justify-between rounded-3xl border border-border bg-card/95 px-8 shadow-[var(--shadow-soft)] backdrop-blur">
          <NavItem {...side[0]} active={pathname.startsWith("/record")} />
          <div className="w-16" />
          <NavItem {...side[1]} active={pathname.startsWith("/profile")} />

          <Link
            to="/"
            aria-label="الرئيسية"
            className={cn(
              "absolute left-1/2 -top-6 flex h-16 w-16 -translate-x-1/2 flex-col items-center justify-center rounded-full border-4 border-background gold-gradient text-gold-foreground transition-transform active:scale-95",
              isHome ? "shadow-[var(--shadow-gold)]" : "opacity-90",
            )}
          >
            <GraduationCap className="h-6 w-6" />
            <span className="text-[10px] font-semibold">الرئيسية</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof User;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex w-16 flex-col items-center gap-1 text-xs transition-colors",
        active ? "text-gold" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
