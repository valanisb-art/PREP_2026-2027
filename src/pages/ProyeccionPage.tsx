import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { activities } from "@/data/activities";
import { subActivitiesMap } from "@/data/subActivities";
import { entregables54 } from "@/data/entregables54";
import { ActivityStatus, SubActivity } from "@/data/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ChevronDown, ChevronRight, Clock, PlayCircle, CheckCircle2, Trash2, Pencil, Download, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { exportTableToXlsx } from "@/lib/exportUtils";
import { computeEntregableProgress } from "@/hooks/usePrepActivitiesWithSubs";
import AddActivityDialog from "@/components/proyeccion/AddActivityDialog";
import AddSubActivityDialog from "@/components/proyeccion/AddSubActivityDialog";
import SubActivityEvidenceUploader from "@/components/proyeccion/SubActivityEvidenceUploader";
import EditActivityDialog from "@/components/proyeccion/EditActivityDialog";
import EditSubActivityDialog from "@/components/proyeccion/EditSubActivityDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

interface CustomActivity {
  id: string;
  entregable: string;
  actividad: string;
  inicio: string;
  termino: string;
  status: string;
  area_responsable: string;
}

interface CustomSubActivity {
  id: string;
  parent_activity_id: string | null;
  parent_static_activity_id: number | null;
  level: number;
  entregable: string;
  actividad: string;
  inicio?: string | null;
  remisionINE2?: string | null;
}

interface TextOverride {
  static_activity_id: number | null;
  sub_entregable: string | null;
  entregable: string | null;
  actividad: string | null;
  inicio?: string | null;
  remisionINE2?: string | null;
}

interface DateOverride {
  activity_id: number;
  termino: string | null;
  inicio: string | null;
}

function SubActivityRow({ sub, activityId, isAdmin, onDelete, isCustomSub, onUpdated, onCheckToggle }: {
  sub: SubActivity & { id?: string; isChecked?: boolean }; activityId: number; isAdmin: boolean;
  onDelete?: () => void; isCustomSub?: boolean; onUpdated?: () => void;
  onCheckToggle?: (isChecked: boolean) => void;
}) {
  const indent = sub.level === 2 ? "pl-8" : "pl-14";
  const hasDates = !!(sub.inicio || sub.remisionINE2);
  return (
    <div className={`flex items-center gap-3 px-4 py-2 ${indent} border-t border-border/20 relative ${sub.level === 2 ? 'bg-primary/5' : 'bg-muted/5'}`}>
      <Checkbox 
        checked={sub.isChecked || false} 
        onCheckedChange={(c) => onCheckToggle && onCheckToggle(!!c)} 
        disabled={!isAdmin && !onCheckToggle}
      />
      <span className={`font-mono text-[11px] w-12 shrink-0 pt-0.5 ${sub.level === 2 ? 'text-primary/70 font-semibold' : 'text-muted-foreground'}`}>{sub.entregable}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-relaxed ${sub.level === 2 ? 'font-medium text-foreground' : 'text-foreground/80'}`}>{sub.actividad}</p>
      </div>
      
      {hasDates && (
        <div className="flex items-center gap-4 shrink-0 mr-4">
          <div className="text-right w-20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inicio</p>
            <p className="text-xs font-medium text-foreground">{sub.inicio ? new Date(sub.inicio + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
          </div>
          <div className="text-right w-20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fin</p>
            <p className="text-xs font-medium text-info">{sub.remisionINE2 ? new Date(sub.remisionINE2 + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 shrink-0">
        <SubActivityEvidenceUploader activityId={activityId} subActivityEntregable={sub.entregable} />
        {isAdmin && isCustomSub && sub.id && onUpdated && (
          <EditSubActivityDialog 
            subId={sub.id} 
            currentEntregable={sub.entregable} 
            currentActividad={sub.actividad} 
            currentLevel={sub.level}
            currentInicio={sub.inicio}
            currentRemisionINE2={sub.remisionINE2}
            onUpdated={onUpdated} 
          />
        )}
        {isAdmin && !isCustomSub && onUpdated && activityId > 0 && (
          <EditSubActivityDialog
            staticActivityId={activityId}
            subEntregable={sub.entregable}
            currentEntregable={sub.entregable}
            currentActividad={sub.actividad}
            currentLevel={sub.level}
            currentInicio={sub.inicio}
            currentRemisionINE2={sub.remisionINE2}
            onUpdated={onUpdated}
          />
        )}
        {isAdmin && isCustomSub && onDelete && (
          <DeleteButton label="subtarea" onConfirm={onDelete} />
        )}
        {isAdmin && !isCustomSub && onDelete && (
          <DeleteButton label="subtarea" onConfirm={onDelete} />
        )}
      </div>
    </div>
  );
}

function DeleteButton({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="text-destructive hover:text-destructive/80 p-1 rounded transition-colors" onClick={e => e.stopPropagation()}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={e => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {label}?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ProyeccionPage() {
  const { isAdmin, isInvitado } = useAuth();
  const toggleSubActivityCheck = async (
    staticId: number | null, 
    customId: string | null, 
    subEntregable: string, 
    currentActividad: string, 
    newChecked: boolean
  ) => {
    try {
      let baseAct = currentActividad.split("|||CHECKED:")[0];
      if (newChecked) baseAct += "|||CHECKED:true";

      if (staticId) {
        const { error } = await supabase.from("activity_text_overrides").upsert({
          static_activity_id: staticId,
          sub_entregable: subEntregable,
          actividad: baseAct
        }, { onConflict: "static_activity_id,sub_entregable" });
        if (error) throw error;
      } else if (customId) {
        const { error } = await supabase.from("custom_sub_activities").update({
          actividad: baseAct
        }).eq("id", customId);
        if (error) throw error;
      }
      toast.success(newChecked ? "Actividad marcada como revisada" : "Marca eliminada");
      fetchCustomData();
    } catch (e: any) {
      toast.error("Error al actualizar: " + e.message);
    }
  };

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | "Todos">("Todos");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<number, ActivityStatus>>({});
  const [customActivities, setCustomActivities] = useState<CustomActivity[]>([]);
  const [customSubs, setCustomSubs] = useState<CustomSubActivity[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [textOverrides, setTextOverrides] = useState<TextOverride[]>([]);
  const [dateOverrides, setDateOverrides] = useState<Record<number, { inicio?: string; termino?: string }>>({});
  const [hiddenStaticSubs, setHiddenStaticSubs] = useState<Set<string>>(new Set());
  const [importMark, setImportMark] = useState<{ appliedAt: string; nivel1?: number; nivel2y3?: number; fileName?: string } | null>(null);

  const fetchStatuses = useCallback(async () => {
    const { data } = await supabase.from("activity_status").select("activity_id, status").eq("section", "prep");
    if (data) {
      const map: Record<number, ActivityStatus> = {};
      data.forEach((row) => { map[row.activity_id] = row.status as ActivityStatus; });
      setStatusOverrides(map);
    }
  }, []);

  const fetchCustomData = useCallback(async () => {
    const [{ data: acts }, { data: subs }, { data: deleted }, { data: overrides }, { data: dateOv }, { data: hiddenSubs }] = await Promise.all([
      supabase.from("custom_activities").select("id, entregable, actividad, inicio, termino, status, area_responsable"),
      supabase.from("custom_sub_activities").select("id, parent_activity_id, parent_static_activity_id, level, entregable, actividad"),
      supabase.from("deleted_activities").select("activity_id"),
      supabase.from("activity_text_overrides").select("static_activity_id, sub_entregable, entregable, actividad"),
      supabase.from("activity_date_overrides").select("activity_id, termino, inicio"),
      supabase.from("hidden_static_subs").select("static_activity_id, sub_entregable"),
    ]);
    if (acts) setCustomActivities(acts);
    if (subs) setCustomSubs(subs as any);
    if (deleted) setDeletedIds(new Set(deleted.map(d => d.activity_id)));
    if (overrides) {
      const cleanedOverrides = (overrides as TextOverride[]).map(o => {
        if (o.actividad && o.actividad.includes("|||DATES:")) {
          return { ...o, actividad: o.actividad.split("|||DATES:")[0] };
        }
        return o;
      });
      setTextOverrides(cleanedOverrides);
    }
    if (dateOv) {
      const m: Record<number, { inicio?: string; termino?: string }> = {};
      (dateOv as DateOverride[]).forEach(d => {
        m[d.activity_id] = { inicio: d.inicio ?? undefined, termino: d.termino ?? undefined };
      });
      setDateOverrides(m);
    }
    if (hiddenSubs) {
      setHiddenStaticSubs(new Set(hiddenSubs.map((h: any) => `${h.static_activity_id}::${h.sub_entregable}`)));
    }
  }, []);

  // Helpers to look up overrides
  const getActivityOverride = (staticId: number) =>
    textOverrides.find(o => o.static_activity_id === staticId && !o.sub_entregable);
  const getSubOverride = (staticId: number, subEntregable: string) =>
    textOverrides.find(o => o.static_activity_id === staticId && o.sub_entregable === subEntregable);

  // Subactividades (estáticas + personalizadas) con su estado de marcado, para calcular el avance por hojas.
  const getSubsConCheck = (act: { staticId?: number; customId?: string; entregable: string }): { entregable: string; checked: boolean }[] => {
    const subs: { entregable: string; checked: boolean }[] = [];
    if (act.staticId) {
      const actNum = parseInt(act.entregable.replace('.0', ''));
      (subActivitiesMap[actNum] || []).forEach((sub) => {
        if (hiddenStaticSubs.has(`${act.staticId}::${sub.entregable}`)) return;
        const ov = getSubOverride(act.staticId!, sub.entregable);
        const raw = ov?.actividad ?? sub.actividad ?? '';
        subs.push({ entregable: ov?.entregable ?? sub.entregable, checked: typeof raw === 'string' && raw.includes('|||CHECKED:true') });
      });
      customSubs.filter((cs) => cs.parent_static_activity_id === act.staticId).forEach((cs) => {
        subs.push({ entregable: cs.entregable, checked: (cs.actividad || '').includes('|||CHECKED:true') });
      });
    } else if (act.customId) {
      customSubs.filter((cs) => cs.parent_activity_id === act.customId).forEach((cs) => {
        subs.push({ entregable: cs.entregable, checked: (cs.actividad || '').includes('|||CHECKED:true') });
      });
    }
    return subs;
  };

  useEffect(() => {
    fetchStatuses();
    fetchCustomData();
    const channel = supabase
      .channel("proyeccion-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_status" }, () => { fetchStatuses(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStatuses, fetchCustomData]);

  // Marca de "última actualización desde Excel" (PREP-32)
  useEffect(() => {
    const API = (import.meta.env.VITE_LOCAL_API_URL as string) || "http://localhost:54321";
    fetch(`${API}/import/mark/PREP-32`)
      .then((r) => r.json())
      .then((j) => { if (j?.data) setImportMark(j.data); })
      .catch(() => { /* la marca es informativa */ });
  }, []);

  // Merge static + custom activities
  const prepActivities = activities
    .filter(a => !deletedIds.has(a.id))
    .filter(a => {
      const y = new Date(a.proyeccion.inicio).getFullYear();
      if (y >= 2026 && y <= 2027) return true;
      const yEnd = new Date(a.proyeccion.termino).getFullYear();
      return yEnd >= 2026 && yEnd <= 2027;
    });

  const allActivities: Array<{
    key: string; entregable: string; actividad: string; inicio: string; termino: string;
    status: ActivityStatus; isCustom: boolean; staticId?: number; customId?: string; remisionINE?: string; remisionINE2?: string;
  }> = [
    ...prepActivities.map(a => {
      const ov = getActivityOverride(a.id);
      const dOv = dateOverrides[a.id];
      return {
        key: `static-${a.id}`,
        entregable: ov?.entregable ?? a.entregable,
        actividad: ov?.actividad ?? a.actividad,
        inicio: dOv?.inicio ?? a.proyeccion.inicio,
        termino: dOv?.termino ?? a.proyeccion.termino,
        status: (statusOverrides[a.id] ?? a.status) as ActivityStatus,
        isCustom: false,
        staticId: a.id,
        remisionINE: a.remisionINE,
        remisionINE2: a.remisionINE2,
      };
    }),
    ...customActivities.map(a => ({
      key: `custom-${a.id}`, entregable: a.entregable, actividad: a.actividad,
      inicio: a.inicio, termino: a.termino, status: a.status as ActivityStatus,
      isCustom: true, customId: a.id,
    })),
  ];

  const stats = (() => {
    let pendiente = 0, enProceso = 0, entregado = 0;
    allActivities.forEach(a => {
      const pct = computeEntregableProgress(getSubsConCheck(a));
      const eff = pct === 100 ? 'Entregado' : a.status;
      if (eff === 'Pendiente') pendiente++;
      else if (eff === 'En Proceso') enProceso++;
      else entregado++;
    });
    return { total: allActivities.length, pendiente, enProceso, entregado };
  })();

  const progress = stats.total > 0 ? Math.round((stats.entregado / stats.total) * 100) : 0;

  const filtered = allActivities.filter((a) => {
    const pct = computeEntregableProgress(getSubsConCheck(a));
    const eff = pct === 100 ? 'Entregado' : a.status;
    const matchSearch = search === "" || a.actividad.toLowerCase().includes(search.toLowerCase()) || a.entregable.includes(search);
    const matchStatus = statusFilter === "Todos" || eff === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = (key: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleDeleteStatic = async (activityId: number) => {
    const { error } = await supabase.from("deleted_activities").insert({
      activity_id: activityId,
      deleted_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) toast.error("Error al eliminar"); else { toast.success("Actividad eliminada"); fetchCustomData(); }
  };

  const handleDeleteCustom = async (id: string) => {
    const { error } = await supabase.from("custom_activities").delete().eq("id", id);
    if (error) toast.error("Error al eliminar"); else { toast.success("Actividad eliminada"); fetchCustomData(); }
  };

  const handleDeleteCustomSub = async (id: string) => {
    const { error } = await supabase.from("custom_sub_activities").delete().eq("id", id);
    if (error) toast.error("Error al eliminar subtarea"); else { toast.success("Subtarea eliminada"); fetchCustomData(); }
  };

  const handleHideStaticSub = async (staticActivityId: number, subEntregable: string) => {
    const { error } = await supabase.from("hidden_static_subs").insert({
      static_activity_id: staticActivityId,
      sub_entregable: subEntregable,
      hidden_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) toast.error("Error al eliminar subtarea"); else { toast.success("Subtarea eliminada"); fetchCustomData(); }
  };

  const calculateProgress = (inicio?: string | null, termino?: string | null, status?: string) => {
    if (status === 'Entregado') return 100;
    if (!inicio || !termino) return 0;
    const today = new Date().getTime();
    const start = new Date(inicio).getTime();
    const end = new Date(termino).getTime();
    if (today < start) return 0;
    if (today > end) return 100;
    if (end === start) return 100;
    return Math.round(((today - start) / (end - start)) * 100);
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">PREP 26 – 27 (32 entregables)</h1>
            <p className="text-sm text-muted-foreground mt-1">Proyección de actividades 2026 – 2027</p>
            {importMark && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/30 text-success text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  3 niveles actualizados conforme al Excel
                  {importMark.fileName ? ` (${importMark.fileName})` : ""} ·{" "}
                  {new Date(importMark.appliedAt).toLocaleString("es-MX", {
                    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isInvitado && (
              <Link to="/prep54">
                <Button size="sm" className="gap-1.5 text-xs">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Ver PREP (54)
                </Button>
              </Link>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => {
                const rows: Record<string, any>[] = [];
                const fmtDate = (d?: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                
                allActivities.forEach(a => {
                  rows.push({
                    'Entregable': a.entregable,
                    'Actividad': a.actividad,
                    'Inicio': fmtDate(a.inicio),
                    'Término': fmtDate(a.termino),
                    'Remisión INE 1': fmtDate(a.remisionINE),
                    'Remisión INE 2': fmtDate(a.remisionINE2),
                    'Avance (%)': calculateProgress(a.inicio, a.termino, a.status),
                    'Estado': a.status,
                  });

                  const actNumber = a.staticId ? parseInt(a.entregable.replace('.0', '')) : 0;
                  const staticSubs = a.staticId ? (subActivitiesMap[actNumber] || []) : [];
                  const dbSubsCustom = a.customId ? customSubs.filter(s => s.parent_activity_id === a.customId) : [];
                  const dbSubsStatic = a.staticId ? customSubs.filter(s => s.parent_static_activity_id === a.staticId) : [];
                  
                  staticSubs.forEach(sub => {
                    const subOv = a.staticId ? getSubOverride(a.staticId, sub.entregable) : undefined;
                    if (a.staticId && hiddenStaticSubs.has(`${a.staticId}::${sub.entregable}`)) return;
                    let rawAct = subOv?.actividad ?? sub.actividad;
                    let parsedInicio = undefined, parsedRemision = undefined;
                    if (rawAct && rawAct.includes("|||DATES:")) {
                      const parts = rawAct.split("|||DATES:");
                      rawAct = parts[0];
                      const dates = parts[1].split(",");
                      parsedInicio = dates[0] || undefined;
                      parsedRemision = dates[1] || undefined;
                    }
                    const finalInicio = parsedInicio !== undefined ? parsedInicio : sub.inicio;
                    const finalRemisionINE2 = parsedRemision !== undefined ? parsedRemision : sub.remisionINE2;

                    rows.push({
                      'Entregable': subOv?.entregable ?? sub.entregable,
                      'Actividad': rawAct,
                      'Inicio': fmtDate(finalInicio),
                      'Término': fmtDate(finalRemisionINE2),
                      'Remisión INE 1': '—',
                      'Remisión INE 2': '—',
                      'Avance (%)': (finalInicio && finalRemisionINE2) ? calculateProgress(finalInicio, finalRemisionINE2, 'Pendiente') : '—',
                      'Estado': '—',
                    });
                  });

                  [...dbSubsCustom, ...dbSubsStatic].forEach(sub => {
                    let rawAct = sub.actividad;
                    let parsedInicio = undefined, parsedRemision = undefined;
                    if (rawAct && rawAct.includes("|||DATES:")) {
                      const parts = rawAct.split("|||DATES:");
                      rawAct = parts[0];
                      const dates = parts[1].split(",");
                      parsedInicio = dates[0] || undefined;
                      parsedRemision = dates[1] || undefined;
                    }
                    rows.push({
                      'Entregable': sub.entregable,
                      'Actividad': rawAct,
                      'Inicio': fmtDate(parsedInicio),
                      'Término': fmtDate(parsedRemision),
                      'Remisión INE 1': '—',
                      'Remisión INE 2': '—',
                      'Avance (%)': (parsedInicio && parsedRemision) ? calculateProgress(parsedInicio, parsedRemision, 'Pendiente') : '—',
                      'Estado': '—',
                    });
                  });
                });

                exportTableToXlsx(rows, 'PREP_26-27_Actividades');
                toast.success('Archivo Excel descargado');
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Excel
            </Button>
            {isAdmin && <AddActivityDialog onAdded={fetchCustomData} />}
          </div>
        </div>

        {/* Status Dashboard */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">Avance General</p>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5 mb-4" />
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10">
              <Clock className="w-4 h-4 text-warning" />
              <div><p className="text-xs text-muted-foreground">Pendientes</p><p className="text-lg font-bold text-foreground">{stats.pendiente}</p></div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-info/10">
              <PlayCircle className="w-4 h-4 text-info" />
              <div><p className="text-xs text-muted-foreground">En Proceso</p><p className="text-lg font-bold text-foreground">{stats.enProceso}</p></div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <div><p className="text-xs text-muted-foreground">Entregados</p><p className="text-lg font-bold text-foreground">{stats.entregado}</p></div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar actividad..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1.5">
            {(["Todos", "Pendiente", "En Proceso", "Entregado"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} resultados</p>

        <div className="bg-card rounded-lg shadow-card border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="w-4 shrink-0" />
            <span className="w-10 shrink-0">Nivel</span>
            <span className="flex-1">Actividad</span>
            <span className="w-16 text-right shrink-0">Inicio</span>
            <span className="w-20 text-right shrink-0">Fin</span>
            <span className="w-28 text-right shrink-0">Avance</span>
            <span className="w-20 text-center shrink-0">Estado</span>
            {isAdmin && <span className="w-8 shrink-0" />}
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No se encontraron actividades.</div>
          ) : (
            filtered.map((act) => {
              const isExpanded = expandedIds.has(act.key);
               const actNumber = act.staticId ? parseInt(act.entregable.replace('.0', '')) : 0;
               const staticSubs = act.staticId ? (subActivitiesMap[actNumber] || []) : [];
               const dbSubsCustom = act.customId ? customSubs.filter(s => s.parent_activity_id === act.customId) : [];
               const dbSubsStatic = act.staticId ? customSubs.filter(s => s.parent_static_activity_id === act.staticId) : [];
               const allDbSubs = [...dbSubsCustom, ...dbSubsStatic];
               const hasSubs = staticSubs.length > 0 || allDbSubs.length > 0 || true; // always expandable for admin to add

               const leafPct = computeEntregableProgress(getSubsConCheck(act));
               const actProgress = leafPct !== null ? leafPct : (act.status === 'Entregado' ? 100 : 0);
               const effectiveStatus = leafPct === 100 ? 'Entregado' : act.status;
               const statusClass = effectiveStatus === 'Pendiente' ? 'status-pendiente' : effectiveStatus === 'En Proceso' ? 'status-en-proceso' : 'status-entregado';

               return (
                 <div key={act.key} className="border-b border-border/50 last:border-b-0">
                   <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => toggleExpand(act.key)}>
                     {hasSubs ? (
                       isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                     ) : <div className="w-4 shrink-0" />}
                     <span className="font-mono text-xs font-bold text-primary w-10 shrink-0">{act.entregable}</span>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-semibold text-foreground line-clamp-2">{act.actividad}</p>
                     </div>
                     <div className="flex items-center gap-4 shrink-0">
                       <div className="text-right">
                         <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inicio</p>
                          <p className="text-xs font-medium text-foreground">{new Date(act.inicio + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                       </div>
                       {(() => {
                         const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                         const ri2 = act.remisionINE2;
                         return (
                           <div className="text-right w-20">
                             <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fin</p>
                             <p className="text-xs font-medium text-info">{ri2 ? fmt(ri2) : '—'}</p>
                           </div>
                         );
                       })()}
                       <div className="flex items-center gap-2 shrink-0">
                         <div className="w-14"><Progress value={actProgress} className="h-1.5" /></div>
                         <span className="text-[10px] text-muted-foreground font-medium w-8">{actProgress}%</span>
                       </div>
                       <span className={`status-badge ${statusClass} shrink-0`}>{effectiveStatus}</span>
                     </div>
                      {isAdmin && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {act.isCustom ? (
                            <EditActivityDialog
                              activityId={act.customId!}
                              currentEntregable={act.entregable}
                              currentActividad={act.actividad}
                              currentInicio={act.inicio}
                              currentTermino={act.termino}
                              onUpdated={fetchCustomData}
                            />
                          ) : (
                            <EditActivityDialog
                              staticActivityId={act.staticId!}
                              currentEntregable={act.entregable}
                              currentActividad={act.actividad}
                              currentInicio={act.inicio}
                              currentTermino={act.termino}
                              onUpdated={fetchCustomData}
                            />
                          )}
                          <DeleteButton
                            label="actividad"
                            onConfirm={() => act.isCustom ? handleDeleteCustom(act.customId!) : handleDeleteStatic(act.staticId!)}
                          />
                        </div>
                      )}
                   </div>

                   {isExpanded && (
                     <div className="bg-muted/5">
                       {staticSubs.map((sub, idx) => {
                         const subOv = act.staticId ? getSubOverride(act.staticId, sub.entregable) : undefined;
                         if (act.staticId && hiddenStaticSubs.has(`${act.staticId}::${sub.entregable}`)) return null;
                         
                         let rawAct = subOv?.actividad ?? sub.actividad;
                         let isChecked = false;
                         if (rawAct && rawAct.includes("|||CHECKED:true")) {
                           isChecked = true;
                           rawAct = rawAct.replace("|||CHECKED:true", "");
                         }
                         let parsedInicio = undefined;
                         let parsedRemision = undefined;
                         if (rawAct && rawAct.includes("|||DATES:")) {
                           const parts = rawAct.split("|||DATES:");
                           rawAct = parts[0];
                           const dates = parts[1].split(",");
                           parsedInicio = dates[0] || undefined;
                           parsedRemision = dates[1] || undefined;
                         }

                         const merged = {
                           ...sub,
                           entregable: subOv?.entregable ?? sub.entregable,
                           actividad: rawAct,
                           inicio: parsedInicio !== undefined ? parsedInicio : sub.inicio,
                           remisionINE2: parsedRemision !== undefined ? parsedRemision : sub.remisionINE2,
                         };
                         return (
                           <SubActivityRow
                             key={`${sub.entregable}-${idx}`}
                             sub={{...merged, isChecked}}
                             activityId={act.staticId || 0}
                             isAdmin={isAdmin}
                             onUpdated={fetchCustomData}
                             onDelete={act.staticId ? () => handleHideStaticSub(act.staticId!, sub.entregable) : undefined}
                             onCheckToggle={isAdmin ? (c) => toggleSubActivityCheck(act.staticId!, null, sub.entregable, subOv?.actividad ?? sub.actividad, c) : undefined}
                           />
                         );
                       })}
                        {allDbSubs.map((sub) => {
                          let rawAct = sub.actividad;
                          let isChecked = false;
                          if (rawAct && rawAct.includes("|||CHECKED:true")) {
                            isChecked = true;
                            rawAct = rawAct.replace("|||CHECKED:true", "");
                          }
                          let parsedInicio = undefined;
                          let parsedRemision = undefined;
                          if (rawAct && rawAct.includes("|||DATES:")) {
                            const parts = rawAct.split("|||DATES:");
                            rawAct = parts[0];
                            const dates = parts[1].split(",");
                            parsedInicio = dates[0] || undefined;
                            parsedRemision = dates[1] || undefined;
                          }

                          return (
                            <SubActivityRow
                              key={sub.id}
                              sub={{ 
                                level: sub.level, 
                                entregable: sub.entregable, 
                                actividad: rawAct, 
                                documento: "", 
                                id: sub.id,
                                inicio: parsedInicio || undefined,
                                remisionINE2: parsedRemision || undefined
                              }}
                              activityId={act.staticId || 0}
                              isAdmin={isAdmin}
                              isCustomSub
                              onDelete={() => handleDeleteCustomSub(sub.id)}
                              onUpdated={fetchCustomData}
                            />
                          );
                        })}
                       <div className="px-4 py-2 flex justify-between items-center border-t border-border/20">
                         {isAdmin && (
                           act.isCustom
                             ? <AddSubActivityDialog parentActivityId={act.customId!} onAdded={fetchCustomData} />
                             : <AddSubActivityDialog parentStaticId={act.staticId!} onAdded={fetchCustomData} />
                         )}
                         {!isAdmin && <div />}
                         <button
                           onClick={(e) => { e.stopPropagation(); navigate(act.staticId ? `/actividad/${act.staticId}` : '#'); }}
                           className="text-xs text-primary font-medium hover:underline"
                         >
                           {act.staticId ? 'Ver detalle completo →' : ''}
                         </button>
                       </div>
                     </div>
                   )}
                 </div>
              );
            })
          )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
