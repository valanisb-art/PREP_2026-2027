import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { activities } from "@/data/activities";
import { subActivitiesMap } from "@/data/subActivities";
import { ActivityStatus, SubActivity } from "@/data/types";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronRight, FileText, Clock, PlayCircle, CheckCircle2 } from "lucide-react";

function SubActivityRow({ sub }: { sub: SubActivity }) {
  const indent = sub.level === 2 ? "pl-8" : "pl-14";
  return (
    <div className={`flex items-start gap-3 px-4 py-2 ${indent} border-t border-border/20 bg-muted/5`}>
      <span className="font-mono text-[11px] text-muted-foreground w-12 shrink-0 pt-0.5">{sub.entregable}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs text-foreground/90 leading-relaxed ${sub.level === 2 ? 'font-medium' : ''}`}>{sub.actividad}</p>
      </div>
      {sub.documento && (
        <div className="flex items-center gap-1 shrink-0">
          <FileText className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground max-w-[120px] truncate">{sub.documento}</span>
        </div>
      )}
    </div>
  );
}

function ActivityRow({ act, isExpanded, onToggle, effectiveStatus }: {
  act: typeof activities[0];
  isExpanded: boolean;
  onToggle: () => void;
  effectiveStatus: ActivityStatus;
}) {
  const navigate = useNavigate();
  const actNumber = parseInt(act.entregable.replace('.0', ''));
  const subs = subActivitiesMap[actNumber] || [];

  const statusClass = (s: string) => {
    if (s === 'Pendiente') return 'status-pendiente';
    if (s === 'En Proceso') return 'status-en-proceso';
    return 'status-entregado';
  };

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors" onClick={onToggle}>
        {subs.length > 0 ? (
          isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <div className="w-4 shrink-0" />
        )}
        <span className="font-mono text-xs font-bold text-primary w-10 shrink-0">{act.entregable}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground line-clamp-2">{act.actividad}</p>
          {act.documento && <p className="text-[10px] text-muted-foreground mt-0.5">{act.documento}</p>}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inicio</p>
            <p className="text-xs font-medium text-foreground">
              {new Date(act.historico.inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fin</p>
            <p className="text-xs font-medium text-foreground">
              {new Date(act.historico.termino).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono w-12 text-center">{act.historico.dias}d</span>
          <span className={`status-badge ${statusClass(effectiveStatus)} shrink-0`}>{effectiveStatus}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-muted/5">
          {subs.map((sub, idx) => (
            <SubActivityRow key={`${sub.entregable}-${idx}`} sub={sub} />
          ))}
          <div className="px-4 py-2 flex justify-end border-t border-border/20">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/actividad/${act.id}?from=historico`); }}
              className="text-xs text-primary font-medium hover:underline"
            >
              Ver detalle completo →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoricoPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | "Todos">("Todos");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<number, ActivityStatus>>({});

  const fetchStatuses = useCallback(async () => {
    const { data } = await supabase.from("activity_status").select("activity_id, status").eq("section", "historico");
    if (data) {
      const map: Record<number, ActivityStatus> = {};
      data.forEach((row) => { map[row.activity_id] = row.status as ActivityStatus; });
      setStatusOverrides(map);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
    const channel = supabase
      .channel("historico-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_status" }, () => { fetchStatuses(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStatuses]);

  const historicoActivities = activities.filter((a) => {
    const year = new Date(a.historico.inicio).getFullYear();
    if (year < 2023 || year > 2025) {
      const yearEnd = new Date(a.historico.termino).getFullYear();
      if (yearEnd < 2023 || yearEnd > 2025) return false;
    }
    return true;
  });

  const stats = {
    total: historicoActivities.length,
    entregado: historicoActivities.filter(a => (statusOverrides[a.id] ?? a.status) === 'Entregado').length,
    enProceso: historicoActivities.filter(a => (statusOverrides[a.id] ?? a.status) === 'En Proceso').length,
    pendiente: historicoActivities.filter(a => (statusOverrides[a.id] ?? a.status) === 'Pendiente').length,
  };
  const progress = stats.total > 0 ? Math.round((stats.entregado / stats.total) * 100) : 0;

  const filtered = historicoActivities.filter((a) => {
    const effectiveStatus = statusOverrides[a.id] ?? a.status;
    const matchSearch = search === "" || a.actividad.toLowerCase().includes(search.toLowerCase()) || a.entregable.includes(search);
    const matchStatus = statusFilter === "Todos" || effectiveStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
          <p className="text-sm text-muted-foreground mt-1">Actividades realizadas en 2023, 2024 y 2025</p>
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
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg font-bold text-foreground">{stats.pendiente}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-info/10">
              <PlayCircle className="w-4 h-4 text-info" />
              <div>
                <p className="text-xs text-muted-foreground">En Proceso</p>
                <p className="text-lg font-bold text-foreground">{stats.enProceso}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Entregados</p>
                <p className="text-lg font-bold text-foreground">{stats.entregado}</p>
              </div>
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
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} resultados</p>

        <div className="bg-card rounded-lg shadow-card border border-border/50 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="w-4 shrink-0" />
            <span className="w-10 shrink-0">Nivel</span>
            <span className="flex-1">Actividad</span>
            <span className="w-16 text-right shrink-0">Inicio</span>
            <span className="w-16 text-right shrink-0">Fin</span>
            <span className="w-12 text-center shrink-0">Días</span>
            <span className="w-20 text-center shrink-0">Estado</span>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No se encontraron actividades para este período.</div>
          ) : (
            filtered.map((act) => (
              <ActivityRow key={act.id} act={act} isExpanded={expandedIds.has(act.id)} onToggle={() => toggleExpand(act.id)} effectiveStatus={statusOverrides[act.id] ?? act.status} />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
