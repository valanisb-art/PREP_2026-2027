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
  // For custom subs (custom_sub_activities)
  subId?: string;
  // For static subs: parent static activity id + sub entregable -> activity_text_overrides
  staticActivityId?: number;
  subEntregable?: string;
  currentEntregable: string;
  currentActividad: string;
  currentLevel: number;
  currentInicio?: string;
  currentRemisionINE2?: string;
  onUpdated: () => void;
}

export default function EditSubActivityDialog({ 
  subId, staticActivityId, subEntregable, 
  currentEntregable, currentActividad, currentLevel,
  currentInicio, currentRemisionINE2,
  onUpdated 
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    entregable: currentEntregable, 
    actividad: currentActividad, 
    level: currentLevel,
    inicio: currentInicio || "",
    remisionINE2: currentRemisionINE2 || ""
  });

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setForm({ 
      entregable: currentEntregable, 
      actividad: currentActividad, 
      level: currentLevel,
      inicio: currentInicio || "",
      remisionINE2: currentRemisionINE2 || ""
    });
    setOpen(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entregable || !form.actividad) { toast.error("Completa los campos obligatorios"); return; }
    setLoading(true);
    let error: { message: string } | null = null;
    
    // Fallback date storage: serialize into actividad string to avoid schema migrations
    let finalActividad = form.actividad;
    if (form.inicio || form.remisionINE2) {
      // Remove any existing serialized dates if they were there (just in case they got pulled into the textarea, though we parse them out in the parent)
      finalActividad = finalActividad.split("|||DATES:")[0];
      finalActividad += `|||DATES:${form.inicio || ''},${form.remisionINE2 || ''}`;
    }

    if (subId) {
      const res = await supabase.from("custom_sub_activities").update({
        entregable: form.entregable,
        actividad: finalActividad,
        level: form.level
      }).eq("id", subId);
      error = res.error;
    } else if (staticActivityId !== undefined && subEntregable) {
      const res = await supabase.from("activity_text_overrides").upsert({
        static_activity_id: staticActivityId,
        sub_entregable: subEntregable,
        entregable: form.entregable,
        actividad: finalActividad
      }, { onConflict: "static_activity_id,sub_entregable" });
      error = res.error;
    }
    setLoading(false);
    if (error) toast.error("Error al actualizar", { description: error.message });
    else { toast.success("Subtarea actualizada"); setOpen(false); onUpdated(); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="text-primary hover:text-primary/80 p-1 rounded transition-colors" onClick={e => e.stopPropagation()}>
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onClick={e => e.stopPropagation()}>
        <DialogHeader><DialogTitle>Editar Subtarea</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Entregable *</Label>
              <Input value={form.entregable} onChange={e => setForm(f => ({ ...f, entregable: e.target.value }))} />
            </div>
            <div>
              <Label>Nivel</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.level} onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))}>
                <option value={2}>Nivel 2</option>
                <option value={3}>Nivel 3</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Actividad *</Label>
            <Textarea value={form.actividad} onChange={e => setForm(f => ({ ...f, actividad: e.target.value }))} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Inicio</Label>
              <Input type="date" value={form.inicio} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} />
            </div>
            <div>
              <Label>Término</Label>
              <Input type="date" value={form.remisionINE2} onChange={e => setForm(f => ({ ...f, remisionINE2: e.target.value }))} />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Guardando..." : "Guardar cambios"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
