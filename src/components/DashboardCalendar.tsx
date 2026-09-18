import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { activities } from "@/data/activities";
import { ActivityStatus } from "@/data/types";
import { ChevronLeft, ChevronRight, MapPin, Play } from "lucide-react";

const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface Deadline {
  entregable: string;
  termino: string;
  id: number;
}

interface ActivityEvent {
  id: number;
  entregable: string;
  inicio: string;
  termino: string;
  status: ActivityStatus;
  isSub?: boolean;
}

interface Props {
  deadlines?: Deadline[];
  activityEvents?: ActivityEvent[];
}

export default function DashboardCalendar({ deadlines = [], activityEvents = [] }: Props) {
  const navigate = useNavigate();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  // Build map of start dates -> activities (using activityEvents with real status if provided, else fallback)
  const activityMap = useMemo(() => {
    const map: Record<string, ActivityEvent[]> = {};
    const events = activityEvents.length > 0 ? activityEvents : activities.map(a => ({
      id: a.id,
      entregable: a.entregable,
      inicio: a.proyeccion.inicio,
      termino: a.proyeccion.termino,
      status: a.status,
    }));

    for (const evt of events) {
      const start = new Date(evt.inicio + "T00:00:00");
      const startKey = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
      if (!map[startKey]) map[startKey] = [];
      map[startKey].push(evt);
    }
    return map;
  }, [activityEvents]);

  // Build a map of deadline dates -> entregable names
  const deadlineMap = useMemo(() => {
    const map: Record<string, Deadline[]> = {};
    for (const dl of deadlines) {
      const d = new Date(dl.termino + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(dl);
    }
    return map;
  }, [deadlines]);

  // Build set of days where an "En Proceso" activity is active (between inicio and termino)
  const enProcesoMap = useMemo(() => {
    const map: Record<string, ActivityEvent[]> = {};
    const events = activityEvents.length > 0 ? activityEvents : activities.map(a => ({
      id: a.id,
      entregable: a.entregable,
      inicio: a.proyeccion.inicio,
      termino: a.proyeccion.termino,
      status: a.status,
    }));

    for (const evt of events) {
      if (evt.status !== 'En Proceso') continue;
      const start = new Date(evt.inicio + "T00:00:00");
      const end = new Date(evt.termino + "T00:00:00");
      // Mark all days in the range for the current month
      const cursor = new Date(Math.max(start.getTime(), new Date(year, month, 1).getTime()));
      const limit = new Date(Math.min(end.getTime(), new Date(year, month + 1, 0).getTime()));
      while (cursor <= limit) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(evt);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [activityEvents, year, month]);

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} className="min-h-[5.5rem] bg-muted/20 rounded-lg" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${month}-${day}`;
    const dayStarts = activityMap[key] || [];
    const dayDeadlines = deadlineMap[key] || [];
    const dayEnProceso = enProcesoMap[key] || [];
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const hasDeadline = dayDeadlines.length > 0;
    const hasEnProceso = dayEnProceso.length > 0;

    // Determine cell border/bg color priority: today > deadline > en proceso > default
    let cellClasses = 'border-border/50 bg-card hover:bg-muted/30';
    if (hasEnProceso) cellClasses = 'border-blue-400/60 bg-blue-500/8 hover:bg-blue-500/15';
    if (hasDeadline) cellClasses = 'border-destructive/60 bg-destructive/5 hover:bg-destructive/10';
    if (isToday) cellClasses = 'border-primary border-2 bg-primary/10 ring-2 ring-primary/20';

    cells.push(
      <div
        key={day}
        className={`min-h-[5.5rem] rounded-lg border p-2 transition-colors relative group ${cellClasses}`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${isToday ? 'text-primary-foreground bg-primary rounded-full w-5 h-5 flex items-center justify-center font-bold' : 'text-muted-foreground'}`}>{day}</span>
          {hasDeadline && (
            <div className="relative">
              <div className="flex items-center gap-0.5">
                <MapPin className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="text-[9px] font-bold text-destructive truncate max-w-[3.5rem]">
                  {dayDeadlines.map(dl => dl.entregable).join(', ')}
                </span>
              </div>
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block min-w-[160px]">
                <div className="bg-popover border border-border rounded-md shadow-lg p-2 text-[10px]">
                  <p className="font-semibold text-destructive mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Fecha límite
                  </p>
                  {dayDeadlines.map((dl) => (
                    <button
                      key={dl.id}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (!dl.isSub) navigate(`/actividad/${dl.id}`); 
                      }}
                      className={`block w-full text-left py-0.5 truncate ${dl.isSub ? 'text-muted-foreground cursor-default' : 'text-foreground hover:text-primary cursor-pointer'}`}
                    >
                      Entregable {dl.entregable}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-0.5 space-y-0.5 overflow-hidden">
          {/* Show activities starting on this day */}
          {dayStarts.slice(0, 2).map((evt) => (
            <button
              key={evt.id}
              onClick={() => {
                if (!evt.isSub) navigate(`/actividad/${evt.id}`);
              }}
              className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate transition-colors ${evt.isSub ? 'cursor-default' : 'cursor-pointer'} ${
                evt.isSub ? 'bg-muted text-muted-foreground border border-border/50' :
                evt.status === 'Entregado' ? 'bg-success/15 text-success' :
                evt.status === 'En Proceso' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold' :
                'bg-warning/15 text-warning'
              }`}
            >
              {evt.status === 'En Proceso' && <Play className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />}
              {evt.entregable}
            </button>
          ))}
          {dayStarts.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{dayStarts.length - 2}</span>
          )}
          {/* Show en proceso indicators if no starts on this day but activity is in progress */}
          {dayStarts.length === 0 && hasEnProceso && (
            <div className="text-[9px] text-blue-500 font-medium truncate">
              ▸ {dayEnProceso.map(e => e.entregable).join(', ')}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card w-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h2 className="text-base font-bold text-foreground font-display">
          {MONTHS_ES[month]} {year}
        </h2>
        <button onClick={next} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {DAYS_ES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells}
      </div>

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-3 flex-wrap">
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-warning/30" /> Pendiente</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-blue-500/30" /> En Proceso</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-success/30" /> Entregado</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-muted border border-border/50" /> Subtarea</div>
        <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-destructive" /> Fecha límite</div>
      </div>
    </div>
  );
}
