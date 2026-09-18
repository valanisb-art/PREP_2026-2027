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
  compact?: boolean;
}

export default function StatusChanger({
  activityId,
  currentStatus,
  dbStatus,
  onStatusChange,
  section = "prep",
  compact = false,
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
    if (compact) {
      const getStatusColor = (status: string) => {
        if (status === 'Entregado') return 'text-green-500 font-semibold';
        if (status === 'En Proceso') return 'text-blue-500 font-semibold';
        if (status === 'Por entregar') return 'text-purple-500 font-semibold';
        return 'text-amber-500 font-semibold';
      };

      return (
        <Select
          value={effectiveStatus}
          onValueChange={handleChange}
          disabled={loading}
        >
          <SelectTrigger className={`h-6 w-[100px] text-[10px] px-2 py-0 border-transparent bg-transparent hover:bg-black/5 dark:hover:bg-white/5 focus:ring-0 ${getStatusColor(effectiveStatus)}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pendiente" className="text-[10px]">Pendiente</SelectItem>
            <SelectItem value="En Proceso" className="text-[10px]">En Proceso</SelectItem>
            <SelectItem value="Por entregar" className="text-[10px]">Por entregar</SelectItem>
            <SelectItem value="Entregado" className="text-[10px]">Entregado</SelectItem>
          </SelectContent>
        </Select>
      );
    }
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
            <SelectItem value="Por entregar">Por entregar</SelectItem>
            <SelectItem value="Entregado">Entregado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return null;
}
