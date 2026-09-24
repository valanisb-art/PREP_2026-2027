import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  parentActivityId?: string;    // for custom activities
  parentStaticId?: number;      // for static activities
  onAdded: () => void;
}

export default function AddSubActivityDialog({ parentActivityId, parentStaticId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ entregable: "", actividad: "", level: 2 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entregable || !form.actividad) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setLoading(true);

    const insertData: Record<string, unknown> = {
      entregable: form.entregable,
      actividad: form.actividad,
      level: form.level,
    };

    if (parentActivityId) {
      insertData.parent_activity_id = parentActivityId;
    } else if (parentStaticId !== undefined) {
      insertData.parent_static_activity_id = parentStaticId;
    }

    const { error } = await supabase.from("custom_sub_activities").insert(insertData as any);
    setLoading(false);
    if (error) {
      toast.error("Error al agregar subtarea", { description: error.message });
    } else {
      toast.success("Subtarea agregada");
      setForm({ entregable: "", actividad: "", level: 2 });
      setOpen(false);
      onAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Plus className="w-3 h-3" /> Subtarea
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Nueva Subtarea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Entregable *</Label>
              <Input placeholder="Ej. 1.1" value={form.entregable} onChange={e => setForm(f => ({ ...f, entregable: e.target.value }))} />
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
            <Textarea placeholder="Descripción" value={form.actividad} onChange={e => setForm(f => ({ ...f, actividad: e.target.value }))} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Guardando..." : "Agregar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
