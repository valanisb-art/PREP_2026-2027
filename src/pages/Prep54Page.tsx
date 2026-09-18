import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePrepActivitiesWithSubs } from "@/hooks/usePrepActivitiesWithSubs";
import AppLayout from "@/components/AppLayout";
import StatusChanger from "@/components/actividad/StatusChanger";
import {
  entregables54Gantt,
  Entregable54Gantt,
  TEMAS_COLORES,
  TEMAS_ORDEN,
  ESTATUS_COLORES,
  RESPONSABLES,
} from "@/data/entregables54Gantt";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  BarChart3,
  Calendar,
  Link2,
  Info,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  List,
  Search,
  X,
  CheckCircle2,
  PlayCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/* ── helpers ─────────────────────────────────────────────────── */

function parseDate(s: string) {
  return new Date(s + "T00:00:00");
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function fmtDate(s: string) {
  return parseDate(s).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtShortMonth(d: Date) {
  return d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
}

/* ── constants ───────────────────────────────────────────────── */

const TIMELINE_START = new Date("2026-08-01T00:00:00");
const TIMELINE_END = new Date("2027-08-01T00:00:00");
const TOTAL_DAYS = diffDays(TIMELINE_START, TIMELINE_END);
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 340;

type TimeScale = "year" | "month" | "day";

const TIME_SCALE_CONFIG: Record<
  TimeScale,
  { dayWidth: number; headerHeight: number; label: string }
> = {
  year: { dayWidth: 1.6, headerHeight: 42, label: "Año" },
  month: { dayWidth: 2.8, headerHeight: 42, label: "Mes" },
  day: { dayWidth: 20, headerHeight: 46, label: "Día" },
};

interface DayInfo {
  dayNum: number;
  date: Date;
  isWeekend: boolean;
  startPx: number;
  widthPx: number;
}

interface MonthInfo {
  label: string;
  fullLabel: string;
  shortMonth: string;
  year: number;
  startPx: number;
  widthPx: number;
  daysCount: number;
  days: DayInfo[];
}

interface YearInfo {
  year: number;
  label: string;
  startPx: number;
  widthPx: number;
}

function getTimeScaleData(dayWidth: number) {
  const months: MonthInfo[] = [];
  const years: YearInfo[] = [];

  const cur = new Date(TIMELINE_START);
  let currentYear: number | null = null;
  let yearStartPx = 0;
  let yearWidthPx = 0;

  while (cur < TIMELINE_END) {
    const mStart = new Date(cur);
    const y = mStart.getFullYear();
    const next = new Date(y, mStart.getMonth() + 1, 1);
    const mEnd = next > TIMELINE_END ? TIMELINE_END : next;
    const startPx = diffDays(TIMELINE_START, mStart) * dayWidth;
    const widthPx = diffDays(mStart, mEnd) * dayWidth;
    const daysCount = diffDays(mStart, mEnd);

    const days: DayInfo[] = [];
    const dayCur = new Date(mStart);
    while (dayCur < mEnd) {
      const dStartPx = diffDays(TIMELINE_START, dayCur) * dayWidth;
      const dayOfWeek = dayCur.getDay();
      days.push({
        dayNum: dayCur.getDate(),
        date: new Date(dayCur),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        startPx: dStartPx,
        widthPx: dayWidth,
      });
      dayCur.setDate(dayCur.getDate() + 1);
    }

    months.push({
      label: `${fmtShortMonth(mStart).toUpperCase()} ${y}`,
      fullLabel: mStart
        .toLocaleDateString("es-MX", { month: "long", year: "numeric" })
        .toUpperCase(),
      shortMonth: fmtShortMonth(mStart).toUpperCase(),
      year: y,
      startPx,
      widthPx,
      daysCount,
      days,
    });

    if (currentYear === null) {
      currentYear = y;
      yearStartPx = startPx;
      yearWidthPx = widthPx;
    } else if (currentYear === y) {
      yearWidthPx += widthPx;
    } else {
      years.push({
        year: currentYear,
        label: `AÑO ${currentYear}`,
        startPx: yearStartPx,
        widthPx: yearWidthPx,
      });
      currentYear = y;
      yearStartPx = startPx;
      yearWidthPx = widthPx;
    }

    cur.setMonth(cur.getMonth() + 1);
    cur.setDate(1);
  }

  if (currentYear !== null) {
    years.push({
      year: currentYear,
      label: `AÑO ${currentYear}`,
      startPx: yearStartPx,
      widthPx: yearWidthPx,
    });
  }

  return { months, years };
}

/* ── Tooltip ─────────────────────────────────────────────────── */

function Tooltip({
  item,
  x,
  y,
  visible,
}: {
  item: Entregable54Gantt | null;
  x: number;
  y: number;
  visible: boolean;
}) {
  if (!item || !visible) return null;
  const estatusColor = ESTATUS_COLORES[item.estatusRelacion] ?? "#888";
  const dias = diffDays(parseDate(item.inicio), parseDate(item.fin));

  return (
    <div
      className="fixed z-[9999] pointer-events-none transition-opacity duration-150"
      style={{
        left: Math.min(x + 16, window.innerWidth - 340),
        top: Math.min(y - 10, window.innerHeight - 300),
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="bg-popover/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl p-4 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: TEMAS_COLORES[item.tema] ?? "#888" }}
          />
          <span className="font-semibold text-sm text-foreground">
            #{item.no} — {item.entregable}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          {item.descripcion}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <span className="text-muted-foreground">Tema</span>
          <span className="text-foreground font-medium truncate">{item.tema}</span>
          <span className="text-muted-foreground">Responsable</span>
          <span className="text-foreground font-medium">{item.responsable}</span>
          <span className="text-muted-foreground">Inicio</span>
          <span className="text-foreground font-medium">{fmtDate(item.inicio)}</span>
          <span className="text-muted-foreground">Fin</span>
          <span className="text-foreground font-medium">{fmtDate(item.fin)}</span>
          <span className="text-muted-foreground">Duración</span>
          <span className="text-foreground font-medium">{dias} días</span>
          <span className="text-muted-foreground">Estatus</span>
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const finDate = parseDate(item.fin);
            const inicioDate = parseDate(item.inicio);
            if (today > finDate) return <span className="font-semibold" style={{ color: "#22c55e" }}>✓ Completado</span>;
            if (today >= inicioDate && today <= finDate) return <span className="font-semibold" style={{ color: "#eab308" }}>● En Proceso</span>;
            return <span className="font-semibold text-muted-foreground">○ Pendiente</span>;
          })()}
          <span className="text-muted-foreground">Relación</span>
          <span className="font-semibold" style={{ color: estatusColor }}>
            {item.estatusRelacion}
          </span>
          {item.actividadesRelacionadas &&
            item.actividadesRelacionadas !== "No especificado en el documento" && (
              <>
                <span className="text-muted-foreground">Actividades</span>
                <span className="text-foreground font-medium">
                  {item.actividadesRelacionadas}
                </span>
              </>
            )}
        </div>
        {item.observaciones && (
          <p className="mt-2 text-[10px] text-muted-foreground italic border-t border-border/40 pt-2">
            {item.observaciones}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── KPI Card ────────────────────────────────────────────────── */

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl px-4 py-3 flex items-center gap-3 min-w-[160px]">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${accent}20` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

/* ── Filter Dropdown ─────────────────────────────────────────── */

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  colorMap,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  colorMap?: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground whitespace-nowrap">{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-card border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer max-w-[200px]"
        style={
          value !== "Todos" && colorMap?.[value]
            ? {
                borderColor: colorMap[value],
                boxShadow: `0 0 0 1px ${colorMap[value]}30`,
              }
            : {}
        }
      >
        <option value="Todos">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Gantt Bar Row (shared between views) ────────────────────── */

/** Determine temporal status of an entregable based on today's date */
function getTemporalStatus(item: Entregable54Gantt): "completado" | "en_proceso" | "futuro" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const finDate = parseDate(item.fin);
  const inicioDate = parseDate(item.inicio);
  if (today > finDate) return "completado";
  if (today >= inicioDate && today <= finDate) return "en_proceso";
  return "futuro";
}

const TEMPORAL_COLORS = {
  completado: "#22c55e",    // green
  en_proceso: "#eab308",    // yellow/amber
  futuro: null,             // uses tema color
};

function GanttBarRow({
  item,
  dayWidth,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: {
  item: Entregable54Gantt;
  dayWidth: number;
  onMouseEnter: (e: React.MouseEvent, item: Entregable54Gantt) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}) {
  const startDay = diffDays(TIMELINE_START, parseDate(item.inicio));
  const endDay = diffDays(TIMELINE_START, parseDate(item.fin));
  const barLeft = Math.max(0, startDay) * dayWidth;
  const barWidth = Math.max((endDay - Math.max(0, startDay)) * dayWidth, 4);
  const temaColor = TEMAS_COLORES[item.tema] ?? "#888";
  const estatusColor = ESTATUS_COLORES[item.estatusRelacion] ?? "#888";
  const duracionDias = diffDays(parseDate(item.inicio), parseDate(item.fin));

  // Temporal status coloring
  const temporalStatus = getTemporalStatus(item);
  const barColor = TEMPORAL_COLORS[temporalStatus] ?? temaColor;

  return (
    <div
      className="relative group"
      style={{
        height: ROW_HEIGHT,
        borderBottom:
          "1px solid color-mix(in srgb, var(--border) 30%, transparent)",
      }}
      onMouseEnter={(ev) => onMouseEnter(ev, item)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="absolute top-[8px] rounded-md transition-all duration-200 cursor-pointer group-hover:brightness-125 group-hover:scale-y-110"
        style={{
          left: barLeft,
          width: barWidth,
          height: ROW_HEIGHT - 16,
          background: `linear-gradient(135deg, ${barColor}, ${barColor}cc)`,
          boxShadow: `0 1px 4px ${barColor}40`,
        }}
      >
        <div
          className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full border-2 border-card"
          style={{ background: estatusColor }}
        />
        {barWidth > 35 && (
          <span className="absolute inset-0 flex items-center px-2 text-[9px] font-medium text-white truncate drop-shadow-sm">
            {barWidth > 160
              ? `E${item.no}: ${item.entregable} (${duracionDias}d)`
              : `E${item.no}`}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */

const GANTT_EXCEL_MONTHS = [
  { label: "Ago 2026", start: "2026-08-01", end: "2026-08-31" },
  { label: "Sep 2026", start: "2026-09-01", end: "2026-09-30" },
  { label: "Oct 2026", start: "2026-10-01", end: "2026-10-31" },
  { label: "Nov 2026", start: "2026-11-01", end: "2026-11-30" },
  { label: "Dic 2026", start: "2026-12-01", end: "2026-12-31" },
  { label: "Ene 2027", start: "2027-01-01", end: "2027-01-31" },
  { label: "Feb 2027", start: "2027-02-01", end: "2027-02-28" },
  { label: "Mar 2027", start: "2027-03-01", end: "2027-03-31" },
  { label: "Abr 2027", start: "2027-04-01", end: "2027-04-30" },
  { label: "May 2027", start: "2027-05-01", end: "2027-05-31" },
  { label: "Jun 2027", start: "2027-06-01", end: "2027-06-30" },
  { label: "Jul 2027", start: "2027-07-01", end: "2027-07-31" },
];

export default function Prep54Page() {
  const { activities: unifiedActivities } = usePrepActivitiesWithSubs();

  const getMatchingActivity = (item: Entregable54Gantt) => {
    if (!item || !item.descripcion) return null;
    
    const cleanDesc = item.descripcion.trim().toLowerCase();
    let match: any = unifiedActivities.find(ua => ua?.actividad?.trim().toLowerCase() === cleanDesc);
    
    if (!match) {
      const numMatch = item.entregable.match(/No\.?\s*(\d+)/i);
      if (numMatch) {
        const num = numMatch[1];
        match = unifiedActivities.find(ua => ua.entregable === num);
      }
    }
    
    if (match) return { activity: match, isSub: false };

    for (const ua of unifiedActivities) {
      const subMatch = (ua.subActivities || []).find((sub: any) => sub?.actividad?.trim().toLowerCase() === cleanDesc);
      if (subMatch) return { activity: subMatch, isSub: true };
    }
    return null;
  };

  const getStatus = (item: Entregable54Gantt) => {
    const matchData = getMatchingActivity(item);
    return matchData ? matchData.activity.status : 'Pendiente';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Entregado') return 'text-green-500';
    if (status === 'En Proceso') return 'text-blue-500';
    return 'text-red-500';
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [temaFilter, setTemaFilter] = useState("Todos");
  const [respFilter, setRespFilter] = useState("Todos");
  const [relFilter, setRelFilter] = useState("Todos");
  const [viewMode, setViewMode] = useState<"grouped" | "continuous">("continuous");
  const [collapsedTemas, setCollapsedTemas] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<{
    item: Entregable54Gantt | null;
    x: number;
    y: number;
    visible: boolean;
  }>({ item: null, x: 0, y: 0, visible: false });
  const [exporting, setExporting] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const sl = e.currentTarget.scrollLeft;
    if (bodyScrollRef.current && Math.abs(bodyScrollRef.current.scrollLeft - sl) > 0.5) {
      bodyScrollRef.current.scrollLeft = sl;
    }
    if (chartRef.current && Math.abs(chartRef.current.scrollLeft - sl) > 0.5) {
      chartRef.current.scrollLeft = sl;
    }
  };

  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const sl = e.currentTarget.scrollLeft;
    if (topScrollRef.current && Math.abs(topScrollRef.current.scrollLeft - sl) > 0.5) {
      topScrollRef.current.scrollLeft = sl;
    }
    if (chartRef.current && Math.abs(chartRef.current.scrollLeft - sl) > 0.5) {
      chartRef.current.scrollLeft = sl;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (ganttContainerRef.current) {
        setContainerWidth(ganttContainerRef.current.clientWidth);
      }
    };

    handleResize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && ganttContainerRef.current) {
      ro = new ResizeObserver(handleResize);
      ro.observe(ganttContainerRef.current);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Responsive label column width based on screen / container size
  const labelWidth = useMemo(() => {
    if (containerWidth > 0 && containerWidth < 640) return 180;
    if (containerWidth > 0 && containerWidth < 1024) return 240;
    return 320;
  }, [containerWidth]);

  // Available width for the chart timeline
  const availableChartWidth = useMemo(() => {
    return Math.max(300, (containerWidth || 1000) - labelWidth - 2);
  }, [containerWidth, labelWidth]);

  const [timeScale, setTimeScale] = useState<TimeScale>("month");

  // Dynamic dayWidth: in "year" view, it auto-fits the exact available width!
  const dayWidth = useMemo(() => {
    switch (timeScale) {
      case "year":
        return availableChartWidth > 0
          ? Math.max(1.4, availableChartWidth / TOTAL_DAYS)
          : 1.6;
      case "month":
        // Zoom in to show ~3-4 months per view (approx 8px per day)
        return 8;
      case "day":
      default:
        return 20;
    }
  }, [timeScale, availableChartWidth]);

  const headerHeight = TIME_SCALE_CONFIG[timeScale].headerHeight;
  const chartWidth = Math.max(
    timeScale === "year" ? availableChartWidth : 0,
    TOTAL_DAYS * dayWidth
  );

  const { months, years } = useMemo(() => getTimeScaleData(dayWidth), [dayWidth]);

  // Today line
  const today = new Date();
  const todayOffset =
    today >= TIMELINE_START && today <= TIMELINE_END
      ? diffDays(TIMELINE_START, today) * dayWidth
      : -1;

  // Filter data
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return entregables54Gantt.filter((e) => {
      if (temaFilter !== "Todos" && e.tema !== temaFilter) return false;
      if (respFilter !== "Todos" && e.responsable !== respFilter) return false;
      if (relFilter !== "Todos" && e.estatusRelacion !== relFilter) return false;
      if (q) {
        const matchNo = String(e.no).includes(q);
        const matchTitle = e.entregable.toLowerCase().includes(q);
        const matchDesc = e.descripcion.toLowerCase().includes(q);
        const matchResp = e.responsable.toLowerCase().includes(q);
        if (!matchNo && !matchTitle && !matchDesc && !matchResp) return false;
      }
      return true;
    });
  }, [temaFilter, respFilter, relFilter, searchQuery]);

  // Group by tema
  const grouped = useMemo(() => {
    const map = new Map<string, Entregable54Gantt[]>();
    for (const t of TEMAS_ORDEN) {
      const items = filtered.filter((e) => e.tema === t);
      if (items.length > 0) map.set(t, items);
    }
    return map;
  }, [filtered]);

  // KPIs
  const kpis = useMemo(() => {
    const directas = filtered.filter(
      (e) => e.estatusRelacion === "RELACIÓN DIRECTA"
    ).length;
    const sinRelacion = filtered.filter(
      (e) => e.estatusRelacion === "SIN RELACIÓN"
    ).length;
    const temas = new Set(filtered.map((e) => e.tema)).size;
    
    let completados = 0, enProceso = 0, pendientes = 0;
    filtered.forEach(item => {
      const status = getTemporalStatus(item);
      if (status === 'completado') completados++;
      else if (status === 'en_proceso') enProceso++;
      else pendientes++;
    });

    return { total: filtered.length, directas, sinRelacion, temas, completados, enProceso, pendientes };
  }, [filtered]);

  const toggleTema = (tema: string) => {
    setCollapsedTemas((prev) => {
      const next = new Set(prev);
      if (next.has(tema)) next.delete(tema);
      else next.add(tema);
      return next;
    });
  };

  // Build flat row list for GROUPED view
  const groupedRows: Array<
    | { type: "header"; tema: string }
    | { type: "item"; item: Entregable54Gantt }
  > = [];
  for (const [tema, items] of grouped) {
    groupedRows.push({ type: "header", tema });
    if (!collapsedTemas.has(tema)) {
      for (const item of items) {
        groupedRows.push({ type: "item", item });
      }
    }
  }

  // Tooltip handlers
  const handleMouseEnter = (ev: React.MouseEvent, item: Entregable54Gantt) => {
    setTooltip({ item, x: ev.clientX, y: ev.clientY, visible: true });
  };
  const handleMouseMove = (ev: React.MouseEvent) => {
    setTooltip((prev) => ({ ...prev, x: ev.clientX, y: ev.clientY }));
  };
  const handleMouseLeave = () => {
    setTooltip({ item: null, x: 0, y: 0, visible: false });
  };

  /* ── Export to Excel ─────────────────────────────────────── */
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Sheet: Diagrama Gantt (Matriz cronológica visual con barras)
    const ganttMatrix = filtered.map((e) => {
      const row: Record<string, any> = {
        "No.": e.no,
        "Entregable": e.entregable,
        "Tema": e.tema,
        "Responsable": e.responsable,
        "Inicio": e.inicio,
        "Fin": e.fin,
        "Duración (días)": diffDays(parseDate(e.inicio), parseDate(e.fin)),
        "Estatus": e.estatusRelacion,
      };
      const dIni = parseDate(e.inicio);
      const dFin = parseDate(e.fin);
      for (const m of GANTT_EXCEL_MONTHS) {
        const mIni = parseDate(m.start);
        const mFin = parseDate(m.end);
        if (dIni <= mFin && dFin >= mIni) {
          row[m.label] = "■■■■■";
        } else {
          row[m.label] = "";
        }
      }
      return row;
    });

    const wsGantt = XLSX.utils.json_to_sheet(ganttMatrix);
    const colWidthsGantt = Object.keys(ganttMatrix[0] || {}).map((key) => ({
      wch: Math.min(
        50,
        Math.max(
          key.length,
          ...ganttMatrix.map((r) => String((r as any)[key] || "").length)
        ) + 2
      ),
    }));
    wsGantt["!cols"] = colWidthsGantt;
    XLSX.utils.book_append_sheet(wb, wsGantt, "Diagrama Gantt");

    // 2. Sheet: Detalle de Entregables
    const data = filtered.map((e) => ({
      "No.": e.no,
      Entregable: e.entregable,
      "Descripción": e.descripcion,
      Tema: e.tema,
      Responsable: e.responsable,
      Inicio: e.inicio,
      Fin: e.fin,
      "Duración (días)": diffDays(parseDate(e.inicio), parseDate(e.fin)),
      "Actividades Relacionadas": e.actividadesRelacionadas,
      "Relaciones Directas": e.relacionesDirectas,
      "Relaciones Indirectas": e.relacionesIndirectas,
      "Estatus de Relación": e.estatusRelacion,
      Observaciones: e.observaciones,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.min(
        60,
        Math.max(
          key.length,
          ...data.map((r) => String((r as any)[key] || "").length)
        ) + 2
      ),
    }));
    ws["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, "Detalle Entregables");

    // 3. Sheet: Resumen por Tema
    const summaryData = TEMAS_ORDEN.filter((t) =>
      filtered.some((e) => e.tema === t)
    ).map((tema) => {
      const items = filtered.filter((e) => e.tema === tema);
      const fechas = items.map((e) => parseDate(e.inicio));
      const fechasFin = items.map((e) => parseDate(e.fin));
      return {
        Tema: tema,
        "Total Entregables": items.length,
        "Inicio más temprano": new Date(
          Math.min(...fechas.map((d) => d.getTime()))
        )
          .toISOString()
          .split("T")[0],
        "Fin más tardío": new Date(
          Math.max(...fechasFin.map((d) => d.getTime()))
        )
          .toISOString()
          .split("T")[0],
        "Rel. Directas": items.filter(
          (e) => e.estatusRelacion === "RELACIÓN DIRECTA"
        ).length,
        "Rel. Indirectas": items.filter(
          (e) => e.estatusRelacion === "RELACIÓN INDIRECTA"
        ).length,
        "Sin Relación": items.filter(
          (e) => e.estatusRelacion === "SIN RELACIÓN"
        ).length,
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    const colWidths2 = Object.keys(summaryData[0] || {}).map((key) => ({
      wch: Math.min(
        50,
        Math.max(
          key.length,
          ...summaryData.map((r) => String((r as any)[key] || "").length)
        ) + 2
      ),
    }));
    ws2["!cols"] = colWidths2;
    XLSX.utils.book_append_sheet(wb, ws2, "Resumen por Tema");

    XLSX.writeFile(wb, "PREP_54_Entregables_Gantt.xlsx");
  };

  /* ── Export to PDF ───────────────────────────────────────── */
  const handleExportPDF = async () => {
    const container = ganttContainerRef.current;
    if (!container) return;

    setExporting(true);
    await new Promise((r) => setTimeout(r, 150));

    const origContainerWidth = container.style.width;
    const origContainerOverflow = container.style.overflow;

    const scrollContainer = container.querySelector(
      ".gantt-scroll-area"
    ) as HTMLElement | null;
    const origScrollOverflow = scrollContainer?.style.overflow;
    const origScrollWidth = scrollContainer?.style.width;

    const chartHeader = chartRef.current;
    const origChartHeaderOverflow = chartHeader?.style.overflow;
    const origChartHeaderWidth = chartHeader?.style.width;

    try {
      const fullWidth = chartWidth + labelWidth;
      container.style.width = `${fullWidth}px`;
      container.style.overflow = "visible";

      if (chartHeader) {
        chartHeader.style.overflow = "visible";
        chartHeader.style.width = `${chartWidth}px`;
      }
      if (scrollContainer) {
        scrollContainer.style.overflow = "visible";
        scrollContainer.style.width = `${chartWidth}px`;
      }

      const isDark = document.documentElement.classList.contains("dark");

      const canvas = await html2canvas(container, {
        backgroundColor: isDark ? "#0f1117" : "#ffffff",
        scale: 1.5,
        useCORS: true,
        logging: false,
        width: fullWidth,
        windowWidth: fullWidth + 100,
      });

      // Restore DOM layout immediately
      container.style.width = origContainerWidth;
      container.style.overflow = origContainerOverflow;
      if (chartHeader) {
        chartHeader.style.overflow = origChartHeaderOverflow || "";
        chartHeader.style.width = origChartHeaderWidth || "";
      }
      if (scrollContainer) {
        scrollContainer.style.overflow = origScrollOverflow || "";
        scrollContainer.style.width = origScrollWidth || "";
      }

      // Generate PDF in Landscape A4
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth(); // 297mm
      const pageH = pdf.internal.pageSize.getHeight(); // 210mm
      const margin = 10;
      const usableW = pageW - margin * 2; // 277mm
      const usableH = pageH - margin * 2 - 16; // 174mm

      const scale = usableW / canvas.width;
      const headerPxHeight = Math.round(headerHeight * 1.5); // Header height in canvas pixels

      // Header canvas for timeline repeating on each page
      const headerCanvas = document.createElement("canvas");
      headerCanvas.width = canvas.width;
      headerCanvas.height = headerPxHeight;
      const hCtx = headerCanvas.getContext("2d")!;
      hCtx.drawImage(
        canvas,
        0, 0, canvas.width, headerPxHeight,
        0, 0, canvas.width, headerPxHeight
      );
      const headerImgData = headerCanvas.toDataURL("image/png");
      const headerMmHeight = headerPxHeight * scale;

      const contentUsableH = usableH - headerMmHeight;
      const rowsPerSlicePx = Math.floor(contentUsableH / scale);

      let yOffset = headerPxHeight;
      let pageNum = 0;

      while (yOffset < canvas.height) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        // Header Title
        pdf.setFontSize(11);
        pdf.setTextColor(99, 102, 241);
        pdf.text(
          "PREP (54) — Diagrama de Gantt · Entregables Calendario 2027",
          margin,
          margin + 4
        );
        pdf.setFontSize(7.5);
        pdf.setTextColor(120, 120, 120);
        pdf.text(
          `Página ${pageNum + 1}   |   ${filtered.length} entregables   |   Generado: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}`,
          margin,
          margin + 9
        );

        // Timeline header repeated on every page
        const headerY = margin + 12;
        pdf.addImage(headerImgData, "PNG", margin, headerY, usableW, headerMmHeight);

        // Slice rows
        const currentSlicePx = Math.min(rowsPerSlicePx, canvas.height - yOffset);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = currentSlicePx;
        const sCtx = sliceCanvas.getContext("2d")!;
        sCtx.drawImage(
          canvas,
          0, yOffset, canvas.width, currentSlicePx,
          0, 0, canvas.width, currentSlicePx
        );

        const sliceImgData = sliceCanvas.toDataURL("image/png");
        const rowsY = headerY + headerMmHeight;
        const sliceMmHeight = currentSlicePx * scale;
        pdf.addImage(sliceImgData, "PNG", margin, rowsY, usableW, sliceMmHeight);

        // Footer
        pdf.setFontSize(6.5);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          "IEEM · Unidad de Informática y Estadística (UIE) — Seguimiento PREP 2027",
          margin,
          pageH - 4
        );

        yOffset += currentSlicePx;
        pageNum++;
      }

      pdf.save("PREP_54_Diagrama_Gantt.pdf");
    } catch (err) {
      console.error("PDF export error:", err);
      container.style.width = origContainerWidth;
      container.style.overflow = origContainerOverflow;
      if (chartHeader) {
        chartHeader.style.overflow = origChartHeaderOverflow || "";
        chartHeader.style.width = origChartHeaderWidth || "";
      }
      if (scrollContainer) {
        scrollContainer.style.overflow = origScrollOverflow || "";
        scrollContainer.style.width = origScrollWidth || "";
      }
    } finally {
      setExporting(false);
    }
  };

  /* ── Determine total rows height for chart ───────────────── */
  const totalRowsForView =
    viewMode === "continuous" ? filtered.length : groupedRows.length;

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                PREP (54)
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Diagrama de Gantt · Entregables del Calendario Electoral 2027
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <Link to="/proyeccion">
              <Button variant="outline" size="sm" className="gap-2">
                <List className="w-3.5 h-3.5" />
                PREP 26-27 (32)
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (Gantt + Detalle)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              <FileText className="w-3.5 h-3.5" />
              {exporting ? "Generando PDF…" : "PDF (Gantt)"}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex flex-wrap gap-3">
          <KpiCard
            icon={BarChart3}
            label="Total Entregables"
            value={kpis.total}
            accent="#6366f1"
          />
          <KpiCard
            icon={CheckCircle2}
            label="Entregados"
            value={kpis.completados}
            accent="#22c55e"
          />
          <KpiCard
            icon={PlayCircle}
            label="En Proceso"
            value={kpis.enProceso}
            accent="#eab308"
          />
          <KpiCard
            icon={Clock}
            label="Pendientes"
            value={kpis.pendientes}
            accent="#8b5cf6"
          />
          <KpiCard
            icon={Link2}
            label="Rel. Directas"
            value={kpis.directas}
            accent="#22c55e"
          />
          <KpiCard
            icon={Info}
            label="Sin Relación"
            value={kpis.sinRelacion}
            accent="#ef4444"
          />
          <KpiCard
            icon={Calendar}
            label="Temas"
            value={kpis.temas}
            accent="#0ea5e9"
          />
        </div>

        {/* Filters + View Toggle */}
        <div className="flex flex-wrap items-center gap-3 bg-card/50 border border-border/40 rounded-xl px-4 py-3">
          {/* Search box */}
          <div className="flex items-center gap-1.5 bg-card border border-border/60 rounded-lg px-2.5 py-1.5 text-xs">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Buscar entregable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/60 w-32 sm:w-44"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <FilterDropdown
            label="Tema"
            value={temaFilter}
            options={TEMAS_ORDEN}
            onChange={setTemaFilter}
            colorMap={TEMAS_COLORES}
          />
          <FilterDropdown
            label="Responsable"
            value={respFilter}
            options={RESPONSABLES}
            onChange={setRespFilter}
          />
          <FilterDropdown
            label="Relación"
            value={relFilter}
            options={Object.keys(ESTATUS_COLORES)}
            onChange={setRelFilter}
            colorMap={ESTATUS_COLORES}
          />
          {(temaFilter !== "Todos" ||
            respFilter !== "Todos" ||
            relFilter !== "Todos" ||
            searchQuery) && (
            <button
              onClick={() => {
                setTemaFilter("Todos");
                setRespFilter("Todos");
                setRelFilter("Todos");
                setSearchQuery("");
              }}
              className="text-xs text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* TimeScale Toggle: Año | Mes | Día */}
            <div className="flex items-center gap-1 border border-border/50 rounded-lg p-0.5 bg-card/60">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase px-2 hidden sm:inline">
                Escala:
              </span>
              {(["year", "month", "day"] as TimeScale[]).map((scale) => {
                const cfg = TIME_SCALE_CONFIG[scale];
                const isActive = timeScale === scale;
                return (
                  <button
                    key={scale}
                    onClick={() => setTimeScale(scale)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* View Mode: Continuo (54) | Por Tema */}
            <div className="flex items-center gap-1 border border-border/50 rounded-lg p-0.5 bg-card/60">
              <button
                onClick={() => setViewMode("continuous")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === "continuous"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Continuo (54)
              </button>
              <button
                onClick={() => setViewMode("grouped")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === "grouped"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Por Tema
              </button>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div
          ref={ganttContainerRef}
          className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm"
        >
          {/* Top Scrollbar */}
          <div className="flex border-b border-border/60 bg-muted/20 items-center">
            <div
              className="shrink-0 px-3 flex items-center border-r border-border/40 z-10 transition-all duration-150"
              style={{
                width: labelWidth,
                minWidth: labelWidth,
                height: 22,
              }}
            >
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                Desplazamiento
              </span>
            </div>
            <div
              ref={topScrollRef}
              className="flex-1 overflow-x-auto overflow-y-hidden"
              style={{ height: 22 }}
              onScroll={handleTopScroll}
            >
              <div style={{ width: chartWidth, height: 1 }} />
            </div>
          </div>

          {/* Sticky header */}
          <div className="flex border-b border-border/60">
            <div
              className="shrink-0 bg-card px-3 sm:px-4 flex items-center border-r border-border/40 z-10 transition-all duration-150"
              style={{
                width: labelWidth,
                minWidth: labelWidth,
                height: headerHeight,
              }}
            >
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Entregable
              </span>
            </div>
            <div className="flex-1 overflow-x-hidden" ref={chartRef}>
              <div
                className="relative"
                style={{ width: chartWidth, height: headerHeight }}
              >
                {/* ── AÑO VIEW HEADER ── */}
                {timeScale === "year" && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-5 border-b border-border/20 flex">
                      {years.map((y) => (
                        <div
                          key={y.year}
                          className="absolute top-0 h-5 flex items-center justify-center text-[10px] font-bold text-foreground/80 tracking-widest border-r border-border/30 bg-muted/20"
                          style={{ left: y.startPx, width: y.widthPx }}
                        >
                          {y.label}
                        </div>
                      ))}
                    </div>
                    <div className="absolute top-5 left-0 right-0 h-5.5 flex">
                      {months.map((m, i) => (
                        <div
                          key={i}
                          className="absolute top-0 h-full flex items-center justify-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/20"
                          style={{ left: m.startPx, width: m.widthPx }}
                        >
                          {m.shortMonth}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── MES VIEW HEADER ── */}
                {timeScale === "month" && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-5 border-b border-border/20 flex">
                      {years.map((y) => (
                        <div
                          key={y.year}
                          className="absolute top-0 h-5 flex items-center justify-center text-[10px] font-bold text-foreground/80 tracking-widest border-r border-border/30 bg-muted/20"
                          style={{ left: y.startPx, width: y.widthPx }}
                        >
                          {y.label}
                        </div>
                      ))}
                    </div>
                    <div className="absolute top-5 left-0 right-0 h-5.5 flex">
                      {months.map((m, i) => (
                        <div
                          key={i}
                          className="absolute top-0 h-full flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/20"
                          style={{ left: m.startPx, width: m.widthPx }}
                        >
                          {m.label}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── DÍA VIEW HEADER ── */}
                {timeScale === "day" && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-6 border-b border-border/20 flex">
                      {months.map((m, i) => (
                        <div
                          key={i}
                          className="absolute top-0 h-full flex items-center justify-center text-[11px] font-bold text-foreground tracking-wider border-r border-border/40 bg-muted/25"
                          style={{ left: m.startPx, width: m.widthPx }}
                        >
                          {m.fullLabel}
                        </div>
                      ))}
                    </div>
                    <div className="absolute top-6 left-0 right-0 h-5 flex">
                      {months
                        .flatMap((m) => m.days)
                        .map((d, i) => (
                          <div
                            key={i}
                            className={`absolute top-0 h-full flex items-center justify-center text-[9px] font-mono border-r border-border/15 ${
                              d.isWeekend
                                ? "bg-muted/35 text-muted-foreground/60 font-medium"
                                : "text-muted-foreground"
                            }`}
                            style={{ left: d.startPx, width: d.widthPx }}
                          >
                            {d.dayNum}
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chart body */}
          <div className="flex">
            {/* Labels column */}
            <div
              className="shrink-0 border-r border-border/40 transition-all duration-150"
              style={{ width: labelWidth, minWidth: labelWidth }}
            >
              {viewMode === "continuous"
                ? /* ── CONTINUOUS VIEW labels ───────────── */
                  filtered.map((e) => {
                    const estatusColor =
                      ESTATUS_COLORES[e.estatusRelacion] ?? "#888";
                    const temaColor = TEMAS_COLORES[e.tema] ?? "#888";
                    return (
                      <div
                        key={`i-${e.no}`}
                        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 text-[11px] transition-colors hover:bg-accent/20"
                        style={{
                          height: ROW_HEIGHT,
                          borderBottom:
                            "1px solid color-mix(in srgb, var(--border) 30%, transparent)",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: temaColor }}
                          title={e.tema}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: estatusColor }}
                        />
                        <span className="font-mono text-muted-foreground w-5 sm:w-6 shrink-0 text-right text-[10px] sm:text-[11px]">
                          {e.no}
                        </span>
                        <span
                          className="text-foreground truncate flex-1"
                          title={e.descripcion}
                        >
                          {e.entregable}
                        </span>
                        <div className="shrink-0 max-w-[90px] hidden md:inline">
                          {(() => {
                            const matchData = getMatchingActivity(e);
                            const status = getStatus(e);
                            if (matchData && !matchData.isSub) {
                              return (
                                <StatusChanger
                                  activityId={Number(matchData.activity.id)}
                                  currentStatus={status}
                                  dbStatus={status}
                                  onStatusChange={() => {}}
                                  compact={true}
                                />
                              );
                            }
                            return (
                              <span className={`text-[10px] font-medium truncate ${getStatusColor(status)}`}>
                                {status}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })
                : /* ── GROUPED VIEW labels ─────────────── */
                  groupedRows.map((row, i) => {
                    if (row.type === "header") {
                      const color = TEMAS_COLORES[row.tema] ?? "#888";
                      const isCollapsed = collapsedTemas.has(row.tema);
                      const count = grouped.get(row.tema)?.length ?? 0;
                      return (
                        <div
                          key={`h-${row.tema}`}
                          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 cursor-pointer select-none transition-colors hover:bg-accent/30"
                          style={{
                            height: ROW_HEIGHT,
                            borderBottom: "1px solid var(--border)",
                          }}
                          onClick={() => toggleTema(row.tema)}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: color }}
                          />
                          <span className="text-[11px] font-semibold text-foreground truncate">
                            {row.tema}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                            {count}
                          </span>
                        </div>
                      );
                    }
                    const e = row.item;
                    const estatusColor =
                      ESTATUS_COLORES[e.estatusRelacion] ?? "#888";
                    return (
                      <div
                        key={`i-${e.no}-${i}`}
                        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 sm:pl-8 text-[11px] transition-colors hover:bg-accent/20"
                        style={{
                          height: ROW_HEIGHT,
                          borderBottom:
                            "1px solid color-mix(in srgb, var(--border) 30%, transparent)",
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: estatusColor }}
                        />
                        <span className="font-mono text-muted-foreground w-5 sm:w-6 shrink-0 text-right text-[10px] sm:text-[11px]">
                          {e.no}
                        </span>
                        <span
                          className="text-foreground truncate flex-1"
                          title={e.descripcion}
                        >
                          {e.entregable}
                        </span>
                        <div className="shrink-0 max-w-[90px] hidden md:inline">
                          {(() => {
                            const matchData = getMatchingActivity(e);
                            const status = getStatus(e);
                            if (matchData && !matchData.isSub) {
                              return (
                                <StatusChanger
                                  activityId={Number(matchData.activity.id)}
                                  currentStatus={status}
                                  dbStatus={status}
                                  onStatusChange={() => {}}
                                  compact={true}
                                />
                              );
                            }
                            return (
                              <span className={`text-[10px] font-medium truncate ${getStatusColor(status)}`}>
                                {status}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
            </div>

            {/* Chart area */}
            <div
              ref={bodyScrollRef}
              className="flex-1 overflow-x-auto gantt-scroll-area"
              onScroll={handleBodyScroll}
            >
              <div className="relative" style={{ width: chartWidth }}>
                {/* Grid lines based on timeScale */}
                {timeScale === "day" ? (
                  <>
                    {months
                      .flatMap((m) => m.days)
                      .map((d, i) => (
                        <div
                          key={`day-grid-${i}`}
                          className={`absolute top-0 bottom-0 ${
                            d.isWeekend
                              ? "bg-muted/10 border-r border-border/10"
                              : "border-r border-border/10"
                          }`}
                          style={{
                            left: d.startPx,
                            width: d.widthPx,
                            height: totalRowsForView * ROW_HEIGHT,
                          }}
                        />
                      ))}
                    {months.map((m, i) => (
                      <div
                        key={`month-bound-${i}`}
                        className="absolute top-0 bottom-0 border-r-2 border-border/30 z-10"
                        style={{
                          left: m.startPx + m.widthPx,
                          width: 0,
                          height: totalRowsForView * ROW_HEIGHT,
                        }}
                      />
                    ))}
                  </>
                ) : (
                  months.map((m, i) => (
                    <div
                      key={`grid-${i}`}
                      className="absolute top-0 bottom-0 border-r border-border/10"
                      style={{
                        left: m.startPx + m.widthPx,
                        width: 0,
                        height: totalRowsForView * ROW_HEIGHT,
                      }}
                    />
                  ))
                )}

                {/* Today line */}
                {todayOffset > 0 && (
                  <div
                    className="absolute top-0 z-20 pointer-events-none"
                    style={{
                      left: todayOffset,
                      height: totalRowsForView * ROW_HEIGHT,
                    }}
                  >
                    <div className="w-0.5 h-full bg-primary/80 shadow-sm" />
                    <div className="absolute -top-0 -left-[18px] bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-b-md shadow">
                      HOY
                    </div>
                  </div>
                )}

                {/* Rows */}
                {viewMode === "continuous"
                  ? /* ── CONTINUOUS VIEW bars ────────────── */
                    filtered.map((e) => (
                      <GanttBarRow
                        key={`cb-${e.no}`}
                        item={e}
                        dayWidth={dayWidth}
                        onMouseEnter={handleMouseEnter}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                      />
                    ))
                  : /* ── GROUPED VIEW bars ───────────────── */
                    groupedRows.map((row, i) => {
                      if (row.type === "header") {
                        return (
                          <div
                            key={`ch-${row.tema}`}
                            className="bg-accent/10"
                            style={{
                              height: ROW_HEIGHT,
                              borderBottom: "1px solid var(--border)",
                            }}
                          />
                        );
                      }
                      return (
                        <GanttBarRow
                          key={`cb-${row.item.no}-${i}`}
                          item={row.item}
                          dayWidth={dayWidth}
                          onMouseEnter={handleMouseEnter}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                        />
                      );
                    })}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-card/50 border border-border/40 rounded-xl px-4 py-3 space-y-3">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Estatus Temporal
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <span className="text-[11px] text-foreground">Completado (fecha fin ya pasó)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#eab308" }}
                />
                <span className="text-[11px] text-foreground">En Proceso (en curso)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#6366f1" }}
                />
                <span className="text-[11px] text-foreground">Pendiente (color del tema)</span>
              </div>
            </div>
          </div>
          <div className="border-t border-border/30 pt-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Estatus de Relación
            </p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(ESTATUS_COLORES).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: color as string }}
                  />
                  <span className="text-[11px] text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-border/30 pt-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Temas / Fases
            </p>
            <div className="flex flex-wrap gap-3">
              {TEMAS_ORDEN.map((tema) => (
                <div key={tema} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: TEMAS_COLORES[tema] }}
                  />
                  <span className="text-[10px] text-foreground/80">{tema}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Tooltip {...tooltip} />
    </AppLayout>
  );
}
