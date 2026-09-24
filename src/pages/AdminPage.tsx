import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Users, Pencil, Trash2, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  apellidos?: string | null;
  telefono?: string | null;
  extension?: string | null;
  estatus?: "activo" | "inactivo";
  username?: string | null;
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
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  
  // State for form
  const [formData, setFormData] = useState<Partial<UserWithRole>>({});
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserWithRole | null }>({
    open: false,
    user: null,
  });

  const isSuperUserAccess = currentUser?.email === SUPER_USER_EMAIL;

  const fetchUsers = async () => {
    setLoading(true);
    // Add new columns. If they don't exist yet, this will fail. We use maybeSingle or catch errors on save.
    // For now, let's just select what we know exists, and try to get the others.
    const { data: profiles, error: profileErr } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    if (profiles && roles) {
      const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
      setUsers(
        profiles
          .filter((p) => p.email)
          .map((p) => ({
            id: p.id,
            email: p.email || "",
            full_name: p.full_name,
            apellidos: p.apellidos || "",
            telefono: p.telefono || "",
            extension: p.extension || "",
            estatus: p.estatus || "activo",
            username: p.username || p.email?.split("@")[0] || "",
            role: (roleMap.get(p.id) as UserWithRole["role"]) || "invitado",
          }))
          .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email))
      );
    } else if (profileErr) {
      toast.error("Error al cargar perfiles: Asegúrate de haber agregado las columnas (apellidos, telefono, extension, estatus, username) a la tabla profiles.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperUserAccess) fetchUsers();
  }, [isSuperUserAccess]);

  const handleEditClick = (user: UserWithRole) => {
    setEditingUser(user);
    setFormData({ ...user });
    setNewPassword("");
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      // 1. Guardar rol en user_roles
      if (formData.role !== editingUser.role) {
        await supabase
          .from("user_roles")
          .upsert({ user_id: editingUser.id, role: formData.role });
      }

      // 2. Guardar perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          apellidos: formData.apellidos,
          telefono: formData.telefono,
          extension: formData.extension,
          estatus: formData.estatus,
          username: formData.username,
        })
        .eq("id", editingUser.id);

      if (profileError) {
         if (profileError.message.includes("Could not find the 'apellidos' column")) {
            toast.error("Las nuevas columnas no existen en la base de datos de Supabase. Necesitas ejecutarlas en el editor SQL.");
         } else {
            throw profileError;
         }
      } else {
        if (newPassword.trim() !== "") {
          toast.info("Para cambiar la contraseña de otro usuario se requiere configuración de backend en Supabase. El resto de los datos fueron guardados.");
        } else {
          toast.success("Usuario actualizado correctamente");
        }
      }
      
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserWithRole) => {
    // Usamos una función RPC segura en Supabase para borrar el usuario de auth.users y perfiles
    const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: user.id });

    if (error) {
      toast.error("Error al eliminar usuario", { description: error.message });
    } else {
      toast.success(`Usuario ${user.full_name || user.email} eliminado por completo del sistema`);
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    }
  };

  if (!isSuperUserAccess) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <Shield className="w-16 h-16 text-muted-foreground opacity-20" />
          <p className="text-muted-foreground font-medium text-lg">No tienes permisos para acceder a esta página.</p>
          <p className="text-muted-foreground text-sm">Solo el Super Administrador puede gestionar usuarios.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-info/5 p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground font-display">Gestión de Usuarios</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Administra roles, accesos y datos de los usuarios registrados (Solo Superusuario).
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 self-start md:self-auto" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Actualizando…" : "Actualizar"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Usuarios</h2>
              <Badge variant="secondary" className="text-xs ml-1">{users.length}</Badge>
            </div>
          </div>

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
                    <TableHead className="text-xs font-bold text-primary uppercase tracking-wider w-[120px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSuper = u.email === SUPER_USER_EMAIL;
                    return (
                      <TableRow key={u.id} className="group transition-colors">
                        <TableCell className="font-medium text-foreground text-sm">
                          <div className="flex items-center gap-2">
                            {isSuper && <Shield className="w-3.5 h-3.5 text-destructive shrink-0" />}
                            {u.full_name || "Sin nombre"} {u.apellidos || ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] font-semibold ${roleBadgeStyles[u.role]}`}>
                            {roleLabels[u.role]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={u.estatus === "activo" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 text-[11px] font-semibold" : "bg-muted text-muted-foreground border-border text-[11px] font-semibold"} variant="outline">
                            {u.estatus === "activo" ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                              onClick={() => handleEditClick(u)}
                              disabled={isSuper}
                              title={isSuper ? "Superusuario protegido" : "Editar usuario"}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteDialog({ open: true, user: u })}
                              disabled={isSuper}
                              title={isSuper ? "Superusuario protegido" : "Eliminar usuario"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE EDICIÓN (Idéntico a imagen 4) */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl pb-2 border-b">
              <Users className="w-5 h-5" /> Editar: {formData.username || editingUser?.email?.split('@')[0]}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Username:</Label>
              <Input value={formData.username || ""} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-muted/50" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nueva Contraseña (vacío = no cambiar):</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nombre: *</Label>
              <Input value={formData.full_name || ""} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Apellidos:</Label>
              <Input value={formData.apellidos || ""} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Correo institucional:</Label>
              <Input value={formData.email || ""} disabled className="bg-muted opacity-60" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Teléfono oficina:</Label>
              <Input value={formData.telefono || ""} onChange={e => setFormData({...formData, telefono: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Extensión:</Label>
              <Input value={formData.extension || ""} onChange={e => setFormData({...formData, extension: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Rol: *</Label>
              <Select value={formData.role} onValueChange={(v: any) => setFormData({...formData, role: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">ADMINISTRADOR</SelectItem>
                  <SelectItem value="operativo">OPERATIVO</SelectItem>
                  <SelectItem value="invitado">INVITADO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Estatus:</Label>
              <Select value={formData.estatus || "activo"} onValueChange={(v: any) => setFormData({...formData, estatus: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row border-t pt-4">
            <Button onClick={handleSaveUser} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              {saving ? "Guardando..." : "Actualizar"}
            </Button>
            <Button variant="secondary" onClick={() => setEditingUser(null)} disabled={saving}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
