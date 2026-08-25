import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut, Settings, Shield, Award } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "الملف الشخصي — مِرقاة" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: role } = useQuery({
    enabled: !!user,
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
      return data?.role ?? "student";
    },
  });

  const { data: badges } = useQuery({
    enabled: !!user,
    queryKey: ["user-badges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_badges").select("badge_id,badges(name,description,icon)").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  if (profile && !initialized) {
    setFullName(profile.full_name ?? "");
    setBio(profile.bio ?? "");
    setPhone(profile.phone ?? "");
    setInitialized(true);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, bio, phone }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("تم حفظ التغييرات");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">جارٍ التحميل...</p></div>;

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">يجب تسجيل الدخول لعرض الملف الشخصي.</p>
        <Button asChild className="gold-gradient text-gold-foreground"><Link to="/auth">تسجيل الدخول</Link></Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <div className="mb-6 flex flex-col items-center gap-3">
        <Avatar className="h-20 w-20 border-2 border-gold">
          <AvatarImage src={profile?.avatar_url ?? ""} />
          <AvatarFallback className="text-2xl">{fullName?.[0] ?? "؟"}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="text-lg font-bold">{fullName || user.email}</h1>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          {role && <span className="mt-1 inline-block rounded-full bg-accent px-3 py-0.5 text-[10px] font-semibold text-accent-foreground">{role === "owner" ? "مالك" : role === "instructor" ? "مدرّب" : role === "moderator" ? "مشرف" : "متدرب"}</span>}
        </div>
        <div className="flex gap-4">
          <div className="text-center"><p className="text-lg font-bold text-gold">{profile?.points ?? 0}</p><p className="text-[10px] text-muted-foreground">نقطة</p></div>
          <div className="text-center"><p className="text-lg font-bold text-gold">{badges?.length ?? 0}</p><p className="text-[10px] text-muted-foreground">شارة</p></div>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings"><Settings className="h-3.5 w-3.5" /> الإعدادات</TabsTrigger>
          <TabsTrigger value="badges"><Award className="h-3.5 w-3.5" /> الشارات</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card className="border-border">
            <CardHeader><CardTitle className="text-sm">الملف الشخصي</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>الاسم الكامل</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="اسمك" /></div>
              <div className="space-y-2"><Label>نبذة تعريفية</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="نبذة عنك..." className="min-h-[60px]" /></div>
              <div className="space-y-2"><Label>رقم الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" /></div>
              <Button onClick={handleSave} disabled={saving} className="w-full gold-gradient text-gold-foreground">{saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}</Button>
            </CardContent>
          </Card>

          {(role === "owner" || role === "instructor") && (
            <Card className="border-border">
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4 text-gold" /> لوحة الإدارة</CardTitle></CardHeader>
              <CardContent><Button asChild variant="outline" className="w-full"><Link to="/admin">لوحة التحكم</Link></Button></CardContent>
            </Card>
          )}

          <Button onClick={handleSignOut} variant="outline" className="w-full text-destructive"><LogOut className="h-4 w-4" /> تسجيل الخروج</Button>
        </TabsContent>

        <TabsContent value="badges" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {badges?.map((ub) => {
              const b = ub as { badge_id: string; badges: { name: string; description: string; icon: string } };
              const badge = b.badges;
              return (
                <Card key={b.badge_id} className="border-gold/30 bg-accent/20">
                  <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full gold-gradient"><Award className="h-6 w-6 text-gold-foreground" /></div>
                    <p className="text-sm font-semibold">{badge?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{badge?.description}</p>
                  </CardContent>
                </Card>
              );
            })}
            {(!badges || badges.length === 0) && <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">لم تكسب أي شارات بعد. أكمل دروساً واختبارات لتحصل على شارات!</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
