import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  onAdded: () => void;
}

export default function AddActivityDialog({ onAdded }: Props) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    entregable: "",
    actividad: "",
    area_responsable: "",
    inicio: "",
    termino: "",
    fundamento: "",
    situacion_critica: "",
  });

  if (!isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entregable || !form.actividad || !form.inicio || !form.termino) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setLoading(true);
    const inicio = new Date(form.inicio);
    const termino = new Date(form.termino);
    const dias = Math.ceil((termino.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

    const { error } = await supabase.from("custom_activities").insert({
      entregable: form.entregable,
      actividad: form.actividad,
      area_responsable: form.area_responsable,
      inicio: form.inicio,
      termino: form.termino,
      dias,
      fundamento: form.fundamento,
      situacion_critica: form.situacion_critica,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });

    setLoading(false);
    if (error) {
      toast.error("Error al agregar actividad", { description: error.message });
    } else {
      toast.success("Actividad agregada");
      setForm({ entregable: "", actividad: "", area_responsable: "", inicio: "", termino: "", fundamento: "", situacion_critica: "" });
      setOpen(false);
      onAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Agregar Actividad
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Actividad</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Entregable *</Label>
              <Input placeholder="Ej. 33.0" value={form.entregable} onChange={e => setForm(f => ({ ...f, entregable: e.target.value }))} />
            </div>
            <div>
              <Label>Área Responsable</Label>
              <Input placeholder="Ej. UIE" value={form.area_responsable} onChange={e => setForm(f => ({ ...f, area_responsable: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Actividad *</Label>
            <Textarea placeholder="Descripción de la actividad" value={form.actividad} onChange={e => setForm(f => ({ ...f, actividad: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha Inicio *</Label>
              <Input type="date" value={form.inicio} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} />
            </div>
            <div>
              <Label>Fecha Término *</Label>
              <Input type="date" value={form.termino} onChange={e => setForm(f => ({ ...f, termino: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Fundamento</Label>
            <Input value={form.fundamento} onChange={e => setForm(f => ({ ...f, fundamento: e.target.value }))} />
          </div>
          <div>
            <Label>Situación Crítica</Label>
            <Input value={form.situacion_critica} onChange={e => setForm(f => ({ ...f, situacion_critica: e.target.value }))} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Guardando..." : "Agregar Actividad"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
