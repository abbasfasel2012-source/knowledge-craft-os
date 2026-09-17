import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Mail, Lock, User } from "lucide-react";
import logo from "@/assets/logo.png";

function getProductionOrigin(): string {
  if (typeof window === "undefined") return "";
  const { hostname, origin } = window.location;
  // في بيئة التطوير المحلي، استخدم الـ origin الحالي
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  // في النشر الفعلي، استخدم الـ origin الحالي دائماً
  return origin;
}

function getAuthRedirect(next?: string) {
  const base = getProductionOrigin();
  return `${base}/auth${next ? `?next=${encodeURIComponent(next)}` : ""}`;
}

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "تسجيل الدخول — تدريب" }] }),
  validateSearch: (s: Record<string, unknown>) => {
    const next = typeof s["next"] === "string" ? s["next"] : "";
    const valid = next.startsWith("/") && !next.startsWith("//") ? next : undefined;
    return valid ? { next: valid } : {};
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const goNext = () => {
    if (next) window.location.href = next;
    else navigate({ to: "/" });
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const handleSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted || !data.session) return;
      if (window.location.hash.includes("type=recovery")) {
        setRecoveryMode(true);
      } else {
        goNext();
      }
    };
    void handleSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (!mounted || !authSession) return;
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      } else if (event === "SIGNED_IN") {
        goNext();
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [next]);

  async function handleGoogleSignIn() {
    setLoading(true);
    const redirectTo = getAuthRedirect(next);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setLoading(false);
      const message = error.message.toLowerCase();
      if (message.includes("provider is not enabled")) {
        toast.error("تسجيل الدخول بواسطة Google غير مفعّل في إعدادات المنصة بعد.");
        return;
      }
      if (message.includes("redirect_uri_mismatch") || message.includes("redirect uri")) {
        toast.error(
          "إعداد Google OAuth يحتاج إضافة عنوان callback الخاص بـ Supabase من لوحة الإعدادات.",
        );
        return;
      }
      toast.error(error.message);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("email not confirmed")) {
        toast.error("يجب تأكيد بريدك الإلكتروني أولاً من الرسالة المرسلة إليك.");
        return;
      }
      if (message.includes("invalid login credentials")) {
        toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        return;
      }
      toast.error(error.message);
      return;
    }
    toast.success("مرحباً بك!");
    goNext();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: getAuthRedirect(),
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        toast.error("هذا البريد مسجل مسبقاً. استخدم تبويب دخول.");
        return;
      }
      toast.error(error.message);
      return;
    }
    if (data.user) {
      if (data.session) {
        toast.success("تم إنشاء حسابك وتسجيل دخولك بنجاح!");
        goNext();
      } else {
        toast.success("تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول.");
      }
    }
  }

  async function resendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("اكتب بريدك الإلكتروني أولاً.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: { emailRedirectTo: getAuthRedirect() },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تمت إعادة إرسال رسالة التأكيد. افحص البريد المهمل أيضاً.");
  }

  async function resetPassword() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("اكتب بريدك الإلكتروني أولاً.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getAuthRedirect(),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إرسال رابط إعادة تعيين كلمة المرور.");
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تغيير كلمة المرور بنجاح.");
    setRecoveryMode(false);
    setPassword("");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3">
        <img src={logo} alt="شعار تدريب" className="h-16 w-16 rounded-3xl object-cover" />
        <div className="text-center">
          <h1 className="text-2xl font-bold">تدريب</h1>
          <p className="text-sm text-muted-foreground">منصة التدريب العربية</p>
        </div>
      </div>

      <Card className="w-full max-w-md border-border shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="text-center text-lg">تسجيل الدخول</CardTitle>
        </CardHeader>
        <CardContent>
          {recoveryMode ? (
            <form onSubmit={updatePassword} className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                أدخل كلمة المرور الجديدة لحسابك.
              </p>
              <div className="space-y-2">
                <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full gold-gradient text-gold-foreground"
              >
                {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
              </Button>
            </form>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="signin">دخول</TabsTrigger>
                <TabsTrigger value="signup">حساب جديد</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="mb-4 w-full gap-2"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold">
                    G
                  </span>
                  {loading ? "جارٍ التحويل..." : "المتابعة باستخدام Google"}
                </Button>
                <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span>أو باستخدام البريد الإلكتروني</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gold-gradient text-gold-foreground"
                  >
                    {loading ? "جارٍ الدخول..." : "دخول"}
                  </Button>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={resendConfirmation}
                      disabled={loading}
                      className="hover:text-foreground hover:underline"
                    >
                      إعادة إرسال التأكيد
                    </button>
                    <button
                      type="button"
                      onClick={resetPassword}
                      disabled={loading}
                      className="hover:text-foreground hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">الاسم الكامل</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="اسمك الكامل"
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="6 أحرف على الأقل"
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gold-gradient text-gold-foreground"
                  >
                    {loading ? "جارٍ الإنشاء..." : "إنشاء حساب"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <GraduationCap className="h-4 w-4 text-gold" />
        <span>تعلّم بإتقان، وتقدّم بثقة</span>
      </div>
    </div>
  );
}
