import { useState } from "react";
import { ActivityStatus } from "@/data/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Lock } from "lucide-react";

interface StatusChangerProps {
  activityId: number;
  currentStatus: ActivityStatus;
  dbStatus: ActivityStatus | null;
  onStatusChange: (newStatus: ActivityStatus) => void;
  section?: string;
}

export default function StatusChanger({
  activityId,
  currentStatus,
  dbStatus,
  onStatusChange,
  section = "prep",
}: StatusChangerProps) {
  const { isAdmin, isOperativo, isInvitado, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const effectiveStatus = dbStatus ?? currentStatus;

  if (isInvitado) return null;

  const handleChange = async (newStatus: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("activity_status")
        .select("id")
        .eq("activity_id", activityId)
        .eq("section", section)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("activity_status")
          .update({ status: newStatus, updated_by: user.id, updated_at: new Date().toISOString() })
          .eq("activity_id", activityId)
          .eq("section", section);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("activity_status")
          .insert({ activity_id: activityId, status: newStatus, updated_by: user.id, section });
        if (error) throw error;
      }

      onStatusChange(newStatus as ActivityStatus);
      toast.success("Estatus actualizado correctamente");
    } catch (err: any) {
      toast.error("Error al actualizar estatus: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isOperativo) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="w-4 h-4" />
        <span>Solo lectura del estatus</span>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex items-center gap-3">
        <Shield className="w-4 h-4 text-primary" />
        <Select
          value={effectiveStatus}
          onValueChange={handleChange}
          disabled={loading}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="En Proceso">En Proceso</SelectItem>
            <SelectItem value="Entregado">Entregado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return null;
}
