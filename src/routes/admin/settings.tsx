import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Megaphone } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "الإعدادات — مِرقاة" }] }),
  component: AdminSettings,
});

function AdminSettings() {
  const queryClient = useQueryClient();
  const [platformName, setPlatformName] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [allowSignup, setAllowSignup] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (settings && !initialized) {
    setPlatformName(settings.platform_name ?? "");
    setTagline(settings.tagline ?? "");
    setAbout(settings.about ?? "");
    setContactEmail(settings.contact_email ?? "");
    setAllowSignup(settings.allow_signup ?? true);
    setInitialized(true);
  }

  const { data: announcements } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,body,created_at")
        .is("course_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      setSaving(true);
      const { error } = await supabase
        .from("platform_settings")
        .update({
          platform_name: platformName,
          tagline,
          about,
          contact_email: contactEmail,
          allow_signup: allowSignup,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      setSaving(false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const annMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("غير مصرح");
      const { error } = await supabase
        .from("announcements")
        .insert({ title: annTitle, body: annBody, created_by: userData.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم نشر الإعلان");
      setAnnTitle("");
      setAnnBody("");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function deleteAnnouncement(id: string) {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-lg font-bold">الإعدادات</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="general">عام</TabsTrigger>
          <TabsTrigger value="announcements">الإعلانات</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-3">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm">إعدادات المنصة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>اسم المنصة</Label>
                <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>الشعار النصي</Label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>من نحن</Label>
                <Textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>بريد التواصل</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={allowSignup} onCheckedChange={setAllowSignup} />
                <Label>السماح بالتسجيل الجديد</Label>
              </div>
              <Button
                onClick={() => saveSettingsMutation.mutate()}
                disabled={saving}
                className="w-full gold-gradient text-gold-foreground"
              >
                {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-3">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-gold" /> إعلان جديد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>العنوان</Label>
                <Input
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="عنوان الإعلان"
                />
              </div>
              <div className="space-y-1.5">
                <Label>المحتوى</Label>
                <Textarea
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  placeholder="نص الإعلان"
                  className="min-h-[80px]"
                />
              </div>
              <Button
                onClick={() => annMutation.mutate()}
                disabled={!annTitle.trim() || !annBody.trim() || annMutation.isPending}
                className="w-full gold-gradient text-gold-foreground"
              >
                <Plus className="h-4 w-4" /> نشر الإعلان
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {announcements?.map((a) => (
              <Card key={a.id} className="border-border">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(a.created_at).toLocaleDateString("ar")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteAnnouncement(a.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!announcements || announcements.length === 0) && (
              <p className="py-4 text-center text-sm text-muted-foreground">لا توجد إعلانات.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
