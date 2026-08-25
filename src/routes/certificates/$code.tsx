import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";

export const Route = createFileRoute("/certificates/$code")({
  head: () => ({ meta: [{ title: "تحقق من شهادة — مِرقاة" }] }),
  component: CertificateVerify,
});

function CertificateVerify() {
  const { code } = Route.useParams();

  const { data: cert, isLoading } = useQuery({
    queryKey: ["certificate", code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("code,issued_at,user:profiles(full_name),course:courses(title)")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">جارٍ التحقق...</p></div>;

  if (!cert) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <Award className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-lg font-bold">شهادة غير صحيحة</h1>
        <p className="text-sm text-muted-foreground">رمز الشهادة غير موجود.</p>
      </div>
    );
  }

  const user = cert.user as { full_name: string } | null;
  const course = cert.course as { title: string } | null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg border-gold/40 shadow-[var(--shadow-gold)]">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full gold-gradient"><Award className="h-10 w-10 text-gold-foreground" /></div>
          <div><p className="text-xs text-muted-foreground">شهادة إتمام</p><h1 className="mt-1 text-xl font-bold">{user?.full_name ?? "متدرب"}</h1></div>
          <div className="w-full border-t border-border pt-4"><p className="text-xs text-muted-foreground">أكمل بنجاح دورة</p><p className="mt-1 text-lg font-semibold">{course?.title ?? "دورة تدريبية"}</p></div>
          <div className="flex w-full justify-between text-xs text-muted-foreground">
            <span>تاريخ الإصدار: {new Date(cert.issued_at).toLocaleDateString("ar")}</span>
            <span>رمز التحقق: {cert.code}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
