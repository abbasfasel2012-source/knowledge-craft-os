import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "المستخدمون — مِرقاة" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const { data: users } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id,full_name,avatar_url,created_at")
        .order("created_at", { ascending: false });
      if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id,role");
      if (error) throw error;
      return data;
    },
  });

  const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]));

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const existing = roles?.find((r) => r.user_id === userId);
      if (existing) {
        const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم تحديث الدور");
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-lg font-bold">المستخدمون</h1>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم..."
          className="pr-10"
        />
      </div>

      <div className="space-y-2">
        {users?.map((u) => (
          <Card key={u.id} className="border-border">
            <CardContent className="flex items-center gap-3 p-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={u.avatar_url ?? ""} />
                <AvatarFallback>{u.full_name?.[0] ?? "؟"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="line-clamp-1 text-sm font-semibold">{u.full_name || "مستخدم"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("ar")}
                </p>
              </div>
              <Select
                value={roleMap.get(u.id) ?? "student"}
                onValueChange={(v) => updateRoleMutation.mutate({ userId: u.id, role: v })}
              >
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">مالك</SelectItem>
                  <SelectItem value="instructor">مدرّب</SelectItem>
                  <SelectItem value="moderator">مشرف</SelectItem>
                  <SelectItem value="student">متدرب</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
        {(!users || users.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد مستخدمون.</p>
        )}
      </div>
    </div>
  );
}
