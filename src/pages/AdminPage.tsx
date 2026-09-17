import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Users, Pencil, Trash2, X, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "operativo" | "invitado";
}

const SUPER_USER_EMAIL = "victor.alanis@ieem.org.mx";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operativo: "Operativo",
  invitado: "Invitado",
};

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20",
  operativo: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20",
  invitado: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
};

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserWithRole | null }>({
    open: false,
    user: null,
  });

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("id, email, full_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    if (profiles && roles) {
      const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
      setUsers(
        profiles
          .filter((p) => p.email) // hide anonymous sessions
          .map((p) => ({
            id: p.id,
            email: p.email || "",
            full_name: p.full_name,
            role: (roleMap.get(p.id) as UserWithRole["role"]) || "invitado",
          }))
          .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email))
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
      toast.success("Rol actualizado correctamente");
      setEditingUserId(null);
      fetchUsers();
    }
  };

  const handleDeleteUser = async (user: UserWithRole) => {
    // We only remove their role entry (soft delete from admin view)
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast.error("Error al eliminar usuario", { description: error.message });
    } else {
      toast.success(`Usuario ${user.full_name || user.email} eliminado`);
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    }
  };

  const startEditing = (user: UserWithRole) => {
    setEditingUserId(user.id);
    setEditingRole(user.role);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingRole("");
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
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-info/5 p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground font-display">Gestión de Usuarios</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Administra los roles y permisos de los usuarios registrados en el sistema.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 self-start md:self-auto" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Actualizando…" : "Actualizar"}
            </Button>
          </div>
        </div>

        {/* Users Card */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Usuarios</h2>
              <Badge variant="secondary" className="text-xs ml-1">{users.length}</Badge>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
              <p className="text-muted-foreground text-sm">Cargando usuarios...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-bold text-primary uppercase tracking-wider w-[200px]">Nombre</TableHead>
                    <TableHead className="text-xs font-bold text-primary uppercase tracking-wider">Correo</TableHead>
                    <TableHead className="text-xs font-bold text-primary uppercase tracking-wider w-[150px]">Rol</TableHead>
                    <TableHead className="text-xs font-bold text-primary uppercase tracking-wider w-[100px] text-center">Estatus</TableHead>
                    <TableHead className="text-xs font-bold text-primary uppercase tracking-wider w-[120px] text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isSuperUser = user.email === SUPER_USER_EMAIL;
                    const isEditing = editingUserId === user.id;

                    return (
                      <TableRow key={user.id} className="group transition-colors">
                        {/* Nombre */}
                        <TableCell className="font-medium text-foreground text-sm">
                          <div className="flex items-center gap-2">
                            {isSuperUser && (
                              <Shield className="w-3.5 h-3.5 text-destructive shrink-0" />
                            )}
                            {user.full_name || "Sin nombre"}
                          </div>
                        </TableCell>

                        {/* Correo */}
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>

                        {/* Rol */}
                        <TableCell>
                          {isEditing ? (
                            <Select value={editingRole} onValueChange={setEditingRole}>
                              <SelectTrigger className="h-8 text-xs w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                                <SelectItem value="operativo">{roleLabels.operativo}</SelectItem>
                                <SelectItem value="invitado">{roleLabels.invitado}</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className={`text-[11px] font-semibold ${roleBadgeStyles[user.role]}`}>
                              {roleLabels[user.role]}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Estatus */}
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 text-[11px] font-semibold" variant="outline">
                            Activo
                          </Badge>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isEditing ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                  onClick={() => handleRoleChange(user.id, editingRole)}
                                  title="Guardar"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={cancelEditing}
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                  onClick={() => startEditing(user)}
                                  disabled={isSuperUser}
                                  title={isSuperUser ? "Superusuario protegido" : "Editar rol"}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteDialog({ open: true, user })}
                                  disabled={isSuperUser}
                                  title={isSuperUser ? "Superusuario protegido" : "Eliminar usuario"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer */}
          {!loading && (
            <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
              <span>Total: {users.length} usuarios registrados</span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-destructive" />
                Superusuario protegido
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: open ? deleteDialog.user : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar usuario?</DialogTitle>
            <DialogDescription>
              Estás a punto de eliminar a <strong>{deleteDialog.user?.full_name || deleteDialog.user?.email}</strong> del sistema.
              Esta acción eliminará su rol asignado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => deleteDialog.user && handleDeleteUser(deleteDialog.user)}>
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

