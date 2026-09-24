import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  // For custom activities (stored in custom_activities)
  activityId?: string;
  // For static activities (stored as overrides in activity_text_overrides)
  staticActivityId?: number;
  currentEntregable: string;
  currentActividad: string;
  currentAreaResponsable?: string;
  currentInicio?: string;
  currentTermino?: string;
  onUpdated: () => void;
}

export default function EditActivityDialog({ activityId, staticActivityId, currentEntregable, currentActividad, currentAreaResponsable, currentInicio, currentTermino, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const toISO = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const [form, setForm] = useState({
    entregable: currentEntregable,
    actividad: currentActividad,
    area_responsable: currentAreaResponsable || "",
    inicio: toISO(currentInicio),
    termino: toISO(currentTermino),
  });

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setForm({
      entregable: currentEntregable,
      actividad: currentActividad,
      area_responsable: currentAreaResponsable || "",
      inicio: toISO(currentInicio),
      termino: toISO(currentTermino),
    });
    setOpen(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entregable || !form.actividad) { toast.error("Completa los campos obligatorios"); return; }
    if (form.inicio && form.termino && new Date(form.termino) < new Date(form.inicio)) {
      toast.error("La fecha de término no puede ser anterior a la de inicio"); return;
    }
    setLoading(true);
    let error: { message: string } | null = null;
    if (activityId) {
      const updates: {
        entregable: string; actividad: string; area_responsable: string;
        inicio?: string; termino?: string; dias?: number;
      } = {
        entregable: form.entregable,
        actividad: form.actividad,
        area_responsable: form.area_responsable,
      };
      if (form.inicio) updates.inicio = form.inicio;
      if (form.termino) updates.termino = form.termino;
      if (form.inicio && form.termino) {
        const d = Math.round((new Date(form.termino).getTime() - new Date(form.inicio).getTime()) / 86400000) + 1;
        updates.dias = d;
      }
      const res = await supabase.from("custom_activities").update(updates).eq("id", activityId);
      error = res.error;
    } else if (staticActivityId !== undefined) {
      const res = await supabase.from("activity_text_overrides").upsert({
        static_activity_id: staticActivityId,
        sub_entregable: null,
        entregable: form.entregable,
        actividad: form.actividad,
      }, { onConflict: "static_activity_id,sub_entregable" });
      error = res.error;
      if (!error && (form.inicio || form.termino)) {
        const payload: { activity_id: number; inicio?: string; termino?: string } = { activity_id: staticActivityId };
        if (form.inicio) payload.inicio = form.inicio;
        if (form.termino) payload.termino = form.termino;
        const res2 = await supabase.from("activity_date_overrides").upsert([payload], { onConflict: "activity_id" });
        error = res2.error;
      }
    }
    setLoading(false);
    if (error) toast.error("Error al actualizar", { description: error.message });
    else { toast.success("Actividad actualizada"); setOpen(false); onUpdated(); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="text-primary hover:text-primary/80 p-1 rounded transition-colors" onClick={e => e.stopPropagation()}>
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onClick={e => e.stopPropagation()}>
        <DialogHeader><DialogTitle>Editar Actividad</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Entregable *</Label>
            <Input value={form.entregable} onChange={e => setForm(f => ({ ...f, entregable: e.target.value }))} />
          </div>
          <div>
            <Label>Actividad *</Label>
            <Textarea value={form.actividad} onChange={e => setForm(f => ({ ...f, actividad: e.target.value }))} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha Inicio</Label>
              <Input type="date" value={form.inicio} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} />
            </div>
            <div>
              <Label>Fecha Término</Label>
              <Input type="date" value={form.termino} onChange={e => setForm(f => ({ ...f, termino: e.target.value }))} />
            </div>
          </div>
          {activityId && (
          <div>
            <Label>Área Responsable</Label>
            <Input value={form.area_responsable} onChange={e => setForm(f => ({ ...f, area_responsable: e.target.value }))} />
          </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Guardando..." : "Guardar cambios"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
