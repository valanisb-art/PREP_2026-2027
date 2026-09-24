import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import DashboardCalendar from "@/components/DashboardCalendar";
import { CalendarDays, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePrepActivitiesWithSubs } from "@/hooks/usePrepActivitiesWithSubs";

export default function CalendarioPage() {
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState("");
  const { activities: unifiedActivities } = usePrepActivitiesWithSubs();

  const searchResults = globalSearch.trim() !== ""
    ? unifiedActivities.filter(a =>
        a.actividad.toLowerCase().includes(globalSearch.toLowerCase()) ||
        a.entregable.toLowerCase().includes(globalSearch.toLowerCase()) ||
        a.areaResponsable.toLowerCase().includes(globalSearch.toLowerCase())
      )
    : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" />
              Calendario de Actividades
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualización de fechas de inicio, término y fechas límite de entregables · PREP 2026-2027
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar actividades, áreas, documentos..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="pl-9" />
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((act) => (
                <button key={act.id} onClick={() => { navigate(`/actividad/${act.id}`); setGlobalSearch(""); }} className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary font-bold">{act.entregable}</span>
                    <span className="text-sm text-foreground line-clamp-1">{act.entregable}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{act.areaResponsable}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Full-width Calendar */}
        <DashboardCalendar
          deadlines={unifiedActivities.map(a => ({ entregable: a.entregable, termino: a.termino, id: Number(a.id) }))}
          activityEvents={(() => {
            const events: any[] = [];
            unifiedActivities.forEach(a => {
              events.push({
                id: Number(a.id),
                entregable: a.entregable,
                inicio: a.inicio,
                termino: a.termino,
                status: a.status,
              });
              a.subActivities.forEach(s => {
                if (s.inicio && s.termino) {
                  events.push({
                    id: Number(s.id) || 0, // mock ID for subactivity
                    entregable: s.entregable,
                    inicio: s.inicio,
                    termino: s.termino,
                    status: s.status,
                    isSub: true,
                  });
                }
              });
            });
            return events;
          })()}
        />
      </div>
    </AppLayout>
  );
}
