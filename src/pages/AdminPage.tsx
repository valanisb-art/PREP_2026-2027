import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users } from "lucide-react";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "operativo" | "invitado";
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operativo: "Operativo",
  invitado: "Invitado",
};

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("id, email, full_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    if (profiles && roles) {
      const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
      setUsers(
        profiles.map((p) => ({
          id: p.id,
          email: p.email || "",
          full_name: p.full_name,
          role: (roleMap.get(p.id) as UserWithRole["role"]) || "invitado",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as UserWithRole["role"] })
      .eq("user_id", userId);

    if (error) {
      toast.error("Error al cambiar rol", { description: error.message });
    } else {
      toast.success("Rol actualizado");
      fetchUsers();
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Administración de Usuarios</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Usuarios registrados ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Cargando usuarios...</p>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">{u.full_name || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Select 
                      value={u.role} 
                      onValueChange={(val) => handleRoleChange(u.id, val)}
                      disabled={u.email === "victor.alanis@ieem.org.mx"}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                        <SelectItem value="operativo">{roleLabels.operativo}</SelectItem>
                        <SelectItem value="invitado">{roleLabels.invitado}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
