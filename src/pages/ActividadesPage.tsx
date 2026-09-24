import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { activities, getStats } from "@/data/activities";
import { subActivitiesMap } from "@/data/subActivities";
import { ActivityStatus, SubActivity } from "@/data/types";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronRight, FileText } from "lucide-react";

function SubActivityRow({ sub }: { sub: SubActivity }) {
  const indent = sub.level === 2 ? "pl-8" : "pl-14";

  return (
    <div className={`flex items-start gap-3 px-4 py-2 ${indent} border-t border-border/20 bg-muted/5`}>
      <span className="font-mono text-[11px] text-muted-foreground w-12 shrink-0 pt-0.5">{sub.entregable}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs text-foreground/90 leading-relaxed ${sub.level === 2 ? 'font-medium' : ''}`}>
          {sub.actividad}
        </p>
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

function ActivityRow({ act, isExpanded, onToggle }: {
  act: typeof activities[0];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const actNumber = parseInt(act.entregable.replace('.0', ''));
  const subs = subActivitiesMap[actNumber] || [];

  const statusClass = (s: string) => {
    if (s === 'Pendiente') return 'status-pendiente';
    if (s === 'En Proceso') return 'status-en-proceso';
    return 'status-entregado';
  };

  const getActivityProgress = () => {
    const today = new Date().getTime();
    const inicio = new Date(act.proyeccion.inicio).getTime();
    const termino = new Date(act.proyeccion.termino).getTime();
    if (act.status === 'Entregado') return 100;
    if (today < inicio) return 0;
    if (today > termino) return 100;
    return Math.round(((today - inicio) / (termino - inicio)) * 100);
  };

  const actProgress = getActivityProgress();

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Main activity row - Level 1 */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        {subs.length > 0 ? (
          isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <div className="w-4 shrink-0" />
        )}
        <span className="font-mono text-xs font-bold text-primary w-10 shrink-0">{act.entregable}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground line-clamp-2">{act.actividad}</p>
          {act.documento && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{act.documento}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-16">
              <Progress value={actProgress} className="h-1.5" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium w-8">{actProgress}%</span>
          </div>
          <span className={`status-badge ${statusClass(act.status)} shrink-0`}>{act.status}</span>
        </div>
      </div>

      {/* Expanded: sub-activities tree + detail link */}
      {isExpanded && (
        <div className="bg-muted/5">
          {subs.map((sub, idx) => (
            <SubActivityRow key={`${sub.entregable}-${idx}`} sub={sub} />
          ))}
          <div className="px-4 py-2 flex justify-end border-t border-border/20">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/actividad/${act.id}`); }}
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

export default function ActividadesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | "Todos">("Todos");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const stats = getStats();
  const progress = Math.round((stats.entregado / stats.total) * 100);

  const filtered = activities.filter((a) => {
    const matchSearch = search === "" || a.actividad.toLowerCase().includes(search.toLowerCase()) || a.entregable.includes(search);
    const matchStatus = statusFilter === "Todos" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Actividades</h1>
          <p className="text-sm text-muted-foreground mt-1">{activities.length} entregables del Anexo 13</p>
        </div>

        {/* General progress */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">Avance General</p>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
          <div className="flex justify-between mt-2">
            <p className="text-xs text-muted-foreground">{stats.entregado} de {stats.total} completados</p>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>🟡 {stats.pendiente} Pendientes</span>
              <span>🔵 {stats.enProceso} En Proceso</span>
              <span>🟢 {stats.entregado} Entregados</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar actividad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {(["Todos", "Pendiente", "En Proceso", "Entregado"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} resultados</p>

        {/* Hierarchical activities list */}
        <div className="bg-card rounded-lg shadow-card border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="w-4 shrink-0" />
            <span className="w-10 shrink-0">Nivel</span>
            <span className="flex-1">Actividad</span>
            <span className="w-28 text-right shrink-0">Avance</span>
            <span className="w-20 text-center shrink-0">Estado</span>
          </div>
          {filtered.map((act) => (
            <ActivityRow
              key={act.id}
              act={act}
              isExpanded={expandedIds.has(act.id)}
              onToggle={() => toggleExpand(act.id)}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
