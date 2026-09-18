import { useMemo, useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { activities, getStats } from "@/data/activities";
import { sessions } from "@/data/sessions";
import { ActivityStatus } from "@/data/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, BarChart3, AlertTriangle, Building, Calendar, TrendingUp, Users, Download, Image, RefreshCw, HelpCircle, Sparkles, CheckCircle2, Clock, Target, Package, Layers, ArrowRightLeft, PieChart as PieIcon } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, BarChart, PieChart, Pie, Cell
} from "recharts";
import { exportTableToXlsx, exportChartAsImage } from "@/lib/exportUtils";
import { supabase } from "@/integrations/supabase/client";
import { entregables54 } from "@/data/entregables54";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const PIE_COLORS = ["hsl(270, 60%, 60%)", "hsl(200, 70%, 50%)", "hsl(152, 60%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 70%, 50%)"];

function SectionHeader({ title, icon, description, hint, chartId, xlsxData, xlsxFilename }: {
  title: string; icon: React.ReactNode;
  description?: string;
  hint?: string;
  chartId?: string;
  xlsxData?: Record<string, any>[]; xlsxFilename?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-4 gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
          {hint && (
            <UITooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="Más información" className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{hint}</TooltipContent>
            </UITooltip>
          )}
        </h2>
        {description && <p className="text-xs text-muted-foreground mt-1 ml-9">{description}</p>}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {xlsxData && xlsxFilename && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportTableToXlsx(xlsxData, xlsxFilename)}>
            <Download className="w-3 h-3" /> Excel
          </Button>
        )}
        {chartId && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportChartAsImage(chartId, chartId)}>
            <Image className="w-3 h-3" /> Imagen
          </Button>
        )}
      </div>
    </div>
  );
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


function parseDate(s: string) {
  return new Date(s + "T00:00:00");
}

function getTemporalStatus(item: { inicio: string | null; fin: string | null; termino54?: string | null }): "completado" | "por_entregar" | "en_proceso" | "futuro" {
  const finStr = item.termino54 || item.fin;
  if (!finStr) return "futuro";
  const finDate = parseDate(finStr);
  const finYear = finDate.getFullYear();
  const finMonth = finDate.getMonth();
  const today = new Date();
  const currYear = today.getFullYear();
  const currMonth = today.getMonth();
  const absFinMonth = finYear * 12 + finMonth;
  const absCurrMonth = currYear * 12 + currMonth;
  
  if (absFinMonth <= absCurrMonth) return "completado";
  if (absFinMonth === absCurrMonth + 1) return "por_entregar";
  
  if (!item.inicio) return "futuro";
  const inicioDate = parseDate(item.inicio);
  if (inicioDate <= today) return "en_proceso";
  return "futuro";
}


function parseDate(s: string) {
  return new Date(s + "T00:00:00");
}

function getTemporalStatus(item: { inicio: string | null; fin: string | null; termino54?: string | null }): "completado" | "por_entregar" | "en_proceso" | "futuro" {
  const finStr = item.termino54 || item.fin;
  if (!finStr) return "futuro";
  const finDate = parseDate(finStr);
  const finYear = finDate.getFullYear();
  const finMonth = finDate.getMonth();
  const today = new Date();
  const currYear = today.getFullYear();
  const currMonth = today.getMonth();
  const absFinMonth = finYear * 12 + finMonth;
  const absCurrMonth = currYear * 12 + currMonth;
  
  if (absFinMonth <= absCurrMonth) return "completado";
  if (absFinMonth === absCurrMonth + 1) return "por_entregar";
  
  if (!item.inicio) return "futuro";
  const inicioDate = parseDate(item.inicio);
  if (inicioDate <= today) return "en_proceso";
  return "futuro";
}

export default function ReportesPage() {
  const [prepStatusOverrides, setPrepStatusOverrides] = useState<Record<number, ActivityStatus>>({});
  const [historicoStatusOverrides, setHistoricoStatusOverrides] = useState<Record<number, ActivityStatus>>({});
  const [customActivities, setCustomActivities] = useState<any[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [dateOverrides, setDateOverrides] = useState<Record<number, { inicio?: string; termino?: string }>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'32' | '54'>('32');

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    const [{ data: prepStatuses }, { data: histStatuses }, { data: customs }, { data: deleted }, { data: dovr }] = await Promise.all([
      supabase.from("activity_status").select("activity_id, status").eq("section", "prep"),
      supabase.from("activity_status").select("activity_id, status").eq("section", "historico"),
      supabase.from("custom_activities").select("*"),
      supabase.from("deleted_activities").select("activity_id"),
      supabase.from("activity_date_overrides").select("activity_id, inicio, termino"),
    ]);
    if (prepStatuses) {
      const map: Record<number, ActivityStatus> = {};
      prepStatuses.forEach(r => { map[r.activity_id] = r.status as ActivityStatus; });
      setPrepStatusOverrides(map);
    }
    if (histStatuses) {
      const map: Record<number, ActivityStatus> = {};
      histStatuses.forEach(r => { map[r.activity_id] = r.status as ActivityStatus; });
      setHistoricoStatusOverrides(map);
    }
    if (customs) setCustomActivities(customs);
    if (deleted) setDeletedIds(new Set(deleted.map(d => d.activity_id)));
    if (dovr) {
      const m: Record<number, { inicio?: string; termino?: string }> = {};
      dovr.forEach((r: any) => { m[r.activity_id] = { inicio: r.inicio ?? undefined, termino: r.termino ?? undefined }; });
      setDateOverrides(m);
    }
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- PREP data (proyección) ---
  const prepActivities = useMemo(() => {
    const staticActs = activities
      .filter(a => !deletedIds.has(a.id))
      .map(a => {
        const dOv = dateOverrides[a.id];
        return {
          ...a,
          proyeccion: {
            ...a.proyeccion,
            inicio: dOv?.inicio ?? a.proyeccion.inicio,
            termino: dOv?.termino ?? a.proyeccion.termino,
          },
          status: (prepStatusOverrides[a.id] ?? a.status) as ActivityStatus,
        };
      })
      .filter(a => {
        const y = new Date(a.proyeccion.inicio + 'T00:00:00').getFullYear();
        const yEnd = new Date(a.proyeccion.termino + 'T00:00:00').getFullYear();
        return (y >= 2026 && y <= 2027) || (yEnd >= 2026 && yEnd <= 2027);
      });
    const customActs = customActivities.map(a => ({
      id: 0,
      entregable: a.entregable,
      actividad: a.actividad,
      documento: a.documento || '',
      fundamento: a.fundamento || '',
      organoAprueba: a.organo_aprueba || '',
      historico: { inicio: '', termino: '', dias: 0 },
      proyeccion: { inicio: a.inicio, termino: a.termino, dias: a.dias || 0 },
      situacionCritica: a.situacion_critica || '',
      areaResponsable: a.area_responsable || '',
      areasInvolucradas: a.areas_involucradas || [],
      etiquetas: a.etiquetas || [],
      status: (a.status || 'Pendiente') as ActivityStatus,
      areaInterna: a.area_interna || '',
      personalArea: a.personal_area || '',
    }));
    return [...staticActs, ...customActs];
  }, [prepStatusOverrides, customActivities, deletedIds, dateOverrides]);

  // --- Histórico data ---
  const historicoActivities = useMemo(() => {
    return activities
      .filter(a => {
        const y = new Date(a.historico.inicio).getFullYear();
        const yEnd = new Date(a.historico.termino).getFullYear();
        return (y >= 2023 && y <= 2025) || (yEnd >= 2023 && yEnd <= 2025);
      })
      .map(a => ({
        ...a,
        status: (historicoStatusOverrides[a.id] ?? a.status) as ActivityStatus,
      }));
  }, [historicoStatusOverrides]);

  // PREP stats
  const prepStats = useMemo(() => {
    let pendiente = 0, enProceso = 0, entregado = 0;
    prepActivities.forEach(a => {
      if (a.status === 'Entregado') entregado++;
      else if (a.status === 'En Proceso') enProceso++;
      else pendiente++;
    });
    return { total: prepActivities.length, pendiente, enProceso, entregado };
  }, [prepActivities]);

  const prepProgress = prepStats.total > 0 ? Math.round((prepStats.entregado / prepStats.total) * 100) : 0;

  const prep54Stats = useMemo(() => {
    let pendiente = 0, enProceso = 0, entregado = 0, porEntregar = 0;
    entregables54.forEach(a => {
      const status = getTemporalStatus(a as any);
      if (status === 'completado') entregado++;
      else if (status === 'por_entregar') porEntregar++;
      else if (status === 'en_proceso') enProceso++;
      else pendiente++;
    });
    return { total: entregables54.length, pendiente, enProceso, entregado, porEntregar };
  }, []);

  const prep54Progress = prep54Stats.total > 0 ? Math.round((prep54Stats.entregado / prep54Stats.total) * 100) : 0;

  const prep54PieByStatus = useMemo(() => {
    return [
      { name: 'Entregado', value: prep54Stats.entregado },
      { name: 'Por Entregar', value: prep54Stats.porEntregar },
      { name: 'En Proceso', value: prep54Stats.enProceso },
      { name: 'Pendiente', value: prep54Stats.pendiente },
    ].filter(d => d.value > 0);
  }, [prep54Stats]);


  const prep54Stats = useMemo(() => {
    let pendiente = 0, enProceso = 0, entregado = 0, porEntregar = 0;
    entregables54.forEach(a => {
      const status = getTemporalStatus(a as any);
      if (status === 'completado') entregado++;
      else if (status === 'por_entregar') porEntregar++;
      else if (status === 'en_proceso') enProceso++;
      else pendiente++;
    });
    return { total: entregables54.length, pendiente, enProceso, entregado, porEntregar };
  }, []);

  const prep54Progress = prep54Stats.total > 0 ? Math.round((prep54Stats.entregado / prep54Stats.total) * 100) : 0;

  const prep54PieByStatus = useMemo(() => {
    return [
      { name: 'Entregado', value: prep54Stats.entregado },
      { name: 'Por Entregar', value: prep54Stats.porEntregar },
      { name: 'En Proceso', value: prep54Stats.enProceso },
      { name: 'Pendiente', value: prep54Stats.pendiente },
    ].filter(d => d.value > 0);
  }, [prep54Stats]);


  // Histórico stats
  const histStats = useMemo(() => {
    let pendiente = 0, enProceso = 0, entregado = 0;
    historicoActivities.forEach(a => {
      if (a.status === 'Entregado') entregado++;
      else if (a.status === 'En Proceso') enProceso++;
      else pendiente++;
    });
    return { total: historicoActivities.length, pendiente, enProceso, entregado };
  }, [historicoActivities]);

  // PREP area groups
  const areaGroups = useMemo(() => {
    const groups: Record<string, { total: number; entregado: number; enProceso: number; pendiente: number }> = {};
    for (const act of prepActivities) {
      const area = act.areaResponsable || 'Sin área';
      if (!groups[area]) groups[area] = { total: 0, entregado: 0, enProceso: 0, pendiente: 0 };
      groups[area].total++;
      if (act.status === 'Entregado') groups[area].entregado++;
      else if (act.status === 'En Proceso') groups[area].enProceso++;
      else groups[area].pendiente++;
    }
    return groups;
  }, [prepActivities]);

  const criticalActivities = prepActivities.filter(a => a.situacionCritica && a.situacionCritica.trim() !== '');
  const upcoming = [...prepActivities].filter(a => a.status !== 'Entregado' && a.proyeccion.termino).sort((a, b) => new Date(a.proyeccion.termino).getTime() - new Date(b.proyeccion.termino).getTime()).slice(0, 10);

  // PREP monthly data — based on the 32 main entregables' Remisión al INE dates
  const monthlyData = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    for (const e of entregables54.filter(e => e.isMain && e.remisionINE)) {
      const [yy, mm] = e.remisionINE!.split('-');
      const key = `${yy}-${mm}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    const months: { key: string; label: string }[] = [];
    let y = 2026, m = 8; // Sep 2026
    while (y < 2027 || (y === 2027 && m <= 6)) { // through Jul 2027
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      months.push({ key, label: `${MONTH_NAMES[m].substring(0, 3)} ${y}` });
      m++; if (m > 11) { m = 0; y++; }
    }
    let cumulative = 0;
    const total = 32;
    return months.map((month) => {
      const count = monthCounts[month.key] || 0;
      cumulative += count;
      return { key: month.key, name: month.label, actividades: count, acumulado: cumulative, objetivo: total, porcentaje: `${Math.min(100, Math.round((cumulative / total) * 100))}%` };
    });
  }, []);

  const prepMonthlyTable = useMemo(() => {
    const data: Record<string, { month: string; year: number; count: number }> = {};
    for (const act of prepActivities) {
      if (!act.proyeccion.termino) continue;
      const [yy, mm] = act.proyeccion.termino.split('-');
      const key = `${yy}-${mm}`;
      if (!data[key]) data[key] = { month: MONTH_NAMES[parseInt(mm, 10) - 1], year: parseInt(yy, 10), count: 0 };
      data[key].count++;
    }
    return Object.values(data).sort((a, b) => a.year !== b.year ? a.year - b.year : MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month));
  }, [prepActivities]);

  // Remisión al INE — counts per month based on the dates from the 32 entregables
  // (or 54 if viewMode is set to expanded mode).
  const remisionMonthlyMap = useMemo(() => {
    const items = viewMode === '32' ? entregables54.filter(e => e.isMain) : entregables54;
    const map: Record<string, number> = {};
    for (const e of items) {
      if (!e.remisionINE) continue;
      const [yy, mm] = e.remisionINE.split('-');
      const key = `${yy}-${mm}`;
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [viewMode]);

  // Side-by-side table: 32 main entregables vs all 54, both by Remisión al INE
  const monthlyCombinedTable = useMemo(() => {
    const map32: Record<string, number> = {};
    const map54: Record<string, number> = {};
    for (const e of entregables54) {
      if (!e.remisionINE) continue;
      const [yy, mm] = e.remisionINE.split('-');
      const key = `${yy}-${mm}`;
      map54[key] = (map54[key] || 0) + 1;
      if (e.isMain) map32[key] = (map32[key] || 0) + 1;
    }
    const keys = Array.from(new Set([...Object.keys(map32), ...Object.keys(map54)])).sort();
    return keys.map(key => {
      const [yy, mm] = key.split('-');
      return {
        key,
        month: MONTH_NAMES[parseInt(mm, 10) - 1],
        year: parseInt(yy, 10),
        termino: map32[key] || 0,
        remision: map54[key] || 0,
      };
    });
  }, []);

  // Compare 32 vs 54 across all months (for the bar chart)
  const comparisonChartData = useMemo(() => {
    const map32: Record<string, number> = {};
    for (const e of entregables54.filter(e => e.isMain && e.remisionINE)) {
      const [yy, mm] = e.remisionINE!.split('-');
      const key = `${yy}-${mm}`;
      map32[key] = (map32[key] || 0) + 1;
    }
    const map54: Record<string, number> = {};
    for (const e of entregables54.filter(e => e.remisionINE)) {
      const [yy, mm] = e.remisionINE!.split('-');
      const key = `${yy}-${mm}`;
      map54[key] = (map54[key] || 0) + 1;
    }
    // Use the termino-based count for the "32" series as that's what the table shows
    const termMap: Record<string, number> = {};
    for (const r of prepMonthlyTable) {
      const mIdx = MONTH_NAMES.indexOf(r.month);
      const key = `${r.year}-${String(mIdx + 1).padStart(2, '0')}`;
      termMap[key] = r.count;
    }
    const months: { key: string; label: string }[] = [];
    let y = 2026, m = 8; // Sep 2026
    while (y < 2027 || (y === 2027 && m <= 6)) { // through Jul 2027
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      months.push({ key, label: `${MONTH_NAMES[m].substring(0, 3)} ${y}` });
      m++; if (m > 11) { m = 0; y++; }
    }
    return months.map(mo => ({
      name: mo.label,
      prep32: termMap[mo.key] || 0,
      prep54: map54[mo.key] || 0,
    }));
  }, [prepMonthlyTable]);

  const totalRemision = useMemo(() => Object.values(remisionMonthlyMap).reduce((a, b) => a + b, 0), [remisionMonthlyMap]);

  // PREP pie chart by year
  const prepPieByYear = useMemo(() => {
    const yearCounts: Record<number, number> = {};
    for (const act of prepActivities) {
      if (!act.proyeccion.termino) continue;
      const y = new Date(act.proyeccion.termino).getFullYear();
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
    return Object.entries(yearCounts).map(([year, count]) => ({ name: year, value: count })).sort((a, b) => Number(a.name) - Number(b.name));
  }, [prepActivities]);

  // PREP pie chart by status
  const prepPieByStatus = useMemo(() => {
    return [
      { name: 'Pendiente', value: prepStats.pendiente },
      { name: 'En Proceso', value: prepStats.enProceso },
      { name: 'Entregado', value: prepStats.entregado },
    ].filter(d => d.value > 0);
  }, [prepStats]);

  // Histórico monthly
  const historicoMonthly = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    for (const act of historicoActivities) {
      if (!act.historico.termino) continue;
      const end = new Date(act.historico.termino);
      const key = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    const months: { key: string; label: string }[] = [];
    let y = 2023, m = 7;
    while (y < 2025 || (y === 2025 && m <= 6)) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      months.push({ key, label: `${MONTH_NAMES[m].substring(0, 3)} ${y}` });
      m++; if (m > 11) { m = 0; y++; }
    }
    let cumulative = 0;
    return months.map((month) => {
      const count = monthCounts[month.key] || 0;
      cumulative += count;
      return { name: month.label, actividades: count, acumulado: cumulative };
    });
  }, [historicoActivities]);

  const historicoMonthlyTable = useMemo(() => {
    const data: Record<string, { month: string; year: number; count: number }> = {};
    for (const act of historicoActivities) {
      if (!act.historico.termino) continue;
      const end = new Date(act.historico.termino);
      const key = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;
      if (!data[key]) data[key] = { month: MONTH_NAMES[end.getMonth()], year: end.getFullYear(), count: 0 };
      data[key].count++;
    }
    return Object.values(data).sort((a, b) => a.year !== b.year ? a.year - b.year : MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month));
  }, [historicoActivities]);

  // Histórico pie by year
  const histPieByYear = useMemo(() => {
    const yearCounts: Record<number, number> = {};
    for (const act of historicoActivities) {
      if (!act.historico.termino) continue;
      const y = new Date(act.historico.termino).getFullYear();
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
    return Object.entries(yearCounts).map(([year, count]) => ({ name: year, value: count })).sort((a, b) => Number(a.name) - Number(b.name));
  }, [historicoActivities]);

  const sessionSummary = useMemo(() => {
    const result = { cepaprep: { extraordinarias: 0, ordinarias: 0, reuniones: 0 }, cg: { extraordinarias: 0, ordinarias: 0, reuniones: 0 } };
    for (const s of sessions) {
      const org = s.organo === 'CEPAPREP' ? 'cepaprep' : 'cg';
      if (s.sesion === 'Reunión de Trabajo') result[org].reuniones++;
      else if (s.tipo === 'Extraordinaria') result[org].extraordinarias++;
      else result[org].ordinarias++;
    }
    return result;
  }, []);

  const CustomAccumulatedLabel = (props: any) => {
    const { x, y, value } = props;
    const pct = `${Math.min(100, Math.round((Number(value) / 32) * 100))}%`;
    return (
      <g>
        <rect x={x - 20} y={y - 22} width={40} height={18} rx={3} fill="hsl(152, 60%, 36%)" />
        <text x={x} y={y - 10} textAnchor="middle" fill="white" fontSize={10} fontWeight={600}>{pct}</text>
      </g>
    );
  };

  const CustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    return <text x={x + width / 2} y={y - 5} textAnchor="middle" fill="hsl(270, 60%, 50%)" fontSize={11} fontWeight={700}>{value}</text>;
  };

  const STATUS_COLORS = ["hsl(38, 92%, 50%)", "hsl(200, 70%, 50%)", "hsl(152, 60%, 36%)", "hsl(270, 60%, 60%)"];

  const prepXlsx = monthlyCombinedTable.map(r => ({ Mes: r.month, Año: r.year, "32 entregables": r.termino, "54 entregables": r.remision }));
  const historicoXlsx = historicoMonthlyTable.map(r => ({ Mes: r.month, Año: r.year, Actividades: r.count }));
  const upcomingXlsx = upcoming.map(a => ({
    Entregable: a.entregable, Actividad: a.actividad, Área: a.areaResponsable,
    Término: a.proyeccion.termino ? new Date(a.proyeccion.termino).toLocaleDateString('es-MX') : '',
    Estado: a.status,
  }));
  const areaXlsx = Object.entries(areaGroups).map(([area, d]) => ({
    Área: area, Total: d.total, Entregados: d.entregado, "En Proceso": d.enProceso, Pendientes: d.pendiente,
    "Avance %": d.total > 0 ? Math.round((d.entregado / d.total) * 100) : 0,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Friendly hero */}
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-info/5 p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground font-display">Reportes</h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Aquí puedes ver de un vistazo cómo va el PREP y consultar el histórico. Pasa el cursor sobre los iconos <HelpCircle className="inline w-3.5 h-3.5 -mt-0.5" /> para entender cada gráfica.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 self-start md:self-auto" onClick={fetchData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualizando…' : 'Actualizar datos'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="prep" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prep">PREP 26-27</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          { /* PREP Tab */ }
          <TabsContent value="prep" className="mt-4">
      <Tabs defaultValue="32" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="32" className="flex items-center justify-center gap-2">
            <Package className="w-4 h-4" />
            <span>32 Entregables</span>
          </TabsTrigger>
          <TabsTrigger value="54" className="flex items-center justify-center gap-2">
            <Layers className="w-4 h-4" />
            <span>54 Entregables</span>
          </TabsTrigger>
          <TabsTrigger value="comparativo" className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Comparativo</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="32" className="space-y-6">
            {/* Executive summary */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-info/5 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-foreground">Resumen ejecutivo</h2>
                  <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
                    Llevamos un <span className="font-semibold text-primary">{prepProgress}%</span> de avance:{" "}
                    <span className="font-semibold text-success">{prepStats.entregado} entregadas</span>,{" "}
                    <span className="font-semibold text-info">{prepStats.enProceso} en proceso</span> y{" "}
                    <span className="font-semibold text-warning">{prepStats.pendiente} pendientes</span> de un total de <span className="font-semibold">{prepStats.total}</span>.
                    {criticalActivities.length > 0 && <> Hay <span className="font-semibold text-destructive">{criticalActivities.length} situaciones críticas</span> que requieren atención.</>}
                  </p>
                </div>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center"><BarChart3 className="w-4 h-4" /></div>
                  <h3 className="text-xs font-semibold text-foreground">¿Cómo vamos en general?</h3>
                </div>
                <div className="text-2xl font-bold text-foreground">{prepProgress}%</div>
                <Progress value={prepProgress} className="h-1.5 mt-2" />
                <p className="text-[11px] text-muted-foreground mt-2">Porcentaje de entregables completados</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md bg-info/10 text-info flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                  <h3 className="text-xs font-semibold text-foreground">Entregables totales</h3>
                </div>
                <div className="text-2xl font-bold text-foreground">{prepStats.total}</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px] gap-1"><CheckCircle2 className="w-3 h-3 text-success" />{prepStats.entregado} entregados</Badge>
                  <Badge variant="outline" className="text-[10px] gap-1"><Clock className="w-3 h-3 text-info" />{prepStats.enProceso} en proceso</Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">{prepStats.pendiente} pendientes</Badge>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md bg-warning/10 text-warning flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></div>
                  <h3 className="text-xs font-semibold text-foreground">Requieren atención</h3>
                </div>
                <div className="text-2xl font-bold text-foreground">{criticalActivities.length}</div>
                <p className="text-[11px] text-muted-foreground mt-2">Actividades marcadas como situación crítica</p>
              </div>
            </div>

            {/* Pie charts: year + status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="stat-card">
                <SectionHeader title="Actividades por año" description="Cómo se distribuyen los entregables entre 2026 y 2027." hint="Cada porción muestra el porcentaje de actividades cuyo término ocurre en ese año." icon={<PieIcon className="w-4 h-4" />} chartId="prep-pie-year" />
                <div id="prep-pie-year">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={prepPieByYear} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} dataKey="value">
                        {prepPieByYear.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} actividades`, '']} />
                      <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="stat-card">
                <SectionHeader title="Actividades por estatus" description="Distribución actual entre pendientes, en proceso y entregadas." hint="Vista rápida del estado general del proyecto." icon={<PieIcon className="w-4 h-4" />} chartId="prep-pie-status" />
                <div id="prep-pie-status">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={prepPieByStatus} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} dataKey="value">
                        {prepPieByStatus.map((d, i) => <Cell key={i} fill={STATUS_COLORS[["Pendiente","En Proceso","Entregado"].indexOf(d.name)] || PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} actividades`, '']} />
                      <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Cumulative monthly progress */}
            <div className="stat-card">
              <SectionHeader title="¿Cómo avanzamos mes a mes?" description="Barras: actividades que terminan ese mes. Línea verde: avance acumulado. Línea punteada: meta total." hint="Permite ver el ritmo esperado de entregas y el progreso acumulado hacia la meta de 32 actividades." icon={<TrendingUp className="w-4 h-4" />} chartId="prep-cumulative-chart" />
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">Ver mes:</span>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {monthlyData.map(m => <SelectItem key={m.key} value={m.key}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div id="prep-cumulative-chart">
                <ResponsiveContainer width="100%" height={380}>
                  <ComposedChart data={selectedMonth === 'all' ? monthlyData : monthlyData.filter(m => m.key === selectedMonth)} margin={{ top: 30, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={{ stroke: 'hsl(220, 16%, 88%)' }} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} domain={[0, 32]} ticks={[0, 8, 16, 24, 32]} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 16%, 88%)', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Line dataKey="objetivo" name="Meta (32)" stroke="hsl(220, 10%, 60%)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                    <Bar dataKey="actividades" name="Actividades del Mes" fill="hsl(270, 60%, 60%)" radius={[4, 4, 0, 0]} barSize={24}>
                      <LabelList content={CustomBarLabel} />
                    </Bar>
                    <Line dataKey="acumulado" name="Acumulado" stroke="hsl(152, 60%, 36%)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(152, 60%, 36%)', stroke: 'white', strokeWidth: 2 }}>
                      <LabelList content={CustomAccumulatedLabel} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            
        </TabsContent>
        <TabsContent value="54" className="space-y-6">
            {/* Executive summary 54 */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-info/5 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-foreground">Resumen ejecutivo (54 Entregables)</h2>
                  <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
                    Llevamos un <span className="font-semibold text-primary">{prep54Progress}%</span> de avance: 
                    <span className="font-semibold text-success"> {prep54Stats.entregado} entregadas</span>, 
                    <span className="font-semibold text-[#a855f7]"> {prep54Stats.porEntregar} por entregar</span>, 
                    <span className="font-semibold text-info"> {prep54Stats.enProceso} en proceso</span> y 
                    <span className="font-semibold text-warning"> {prep54Stats.pendiente} pendientes</span> de un total de <span className="font-semibold">{prep54Stats.total}</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* KPI cards 54 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center"><BarChart3 className="w-4 h-4" /></div>
                  <h3 className="text-xs font-semibold text-foreground">Â¿CÃ³mo vamos en general?</h3>
                </div>
                <div className="text-2xl font-bold text-foreground">{prep54Progress}%</div>
                <Progress value={prep54Progress} className="h-1.5 mt-2" />
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md bg-info/10 text-info flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                  <h3 className="text-xs font-semibold text-foreground">Entregables totales</h3>
                </div>
                <div className="text-2xl font-bold text-foreground">{prep54Stats.total}</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px] gap-1"><CheckCircle2 className="w-3 h-3 text-success" />{prep54Stats.entregado} entregados</Badge>
                  {prep54Stats.porEntregar > 0 && <Badge variant="outline" className="text-[10px] gap-1"><Package className="w-3 h-3 text-[#a855f7]" />{prep54Stats.porEntregar} por entregar</Badge>}
                  <Badge variant="outline" className="text-[10px] gap-1"><Clock className="w-3 h-3 text-info" />{prep54Stats.enProceso} en proceso</Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">{prep54Stats.pendiente} pendientes</Badge>
                </div>
              </div>
            </div>

            {/* Pie chart 54 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="stat-card">
                <SectionHeader title="Actividades por estatus" description="DistribuciÃ³n actual entre pendientes, en proceso, por entregar y completadas." icon={<PieIcon className="w-4 h-4" />} />
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={prep54PieByStatus} cx="50%" cy="50%" labelLine={false} outerRadius={100} dataKey="value">
                        {prep54PieByStatus.map((d, i) => <Cell key={i} fill={STATUS_COLORS[["Pendiente","En Proceso","Entregado","Por Entregar"].indexOf(d.name)] || PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} actividades`} />
                      <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
        </TabsContent>
        <TabsContent value="comparativo" className="space-y-6">
{/* Monthly breakdown table */}
            <div className="stat-card">
              <SectionHeader title="Desglose mensual" description="Entregables por mes según la fecha de Remisión al INE. Comparativo entre los 32 entregables principales y los 54 totales (incluyendo sub-entregables)." icon={<Calendar className="w-4 h-4" />} xlsxData={prepXlsx} xlsxFilename="prep_desglose_mensual" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Mes</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Año</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">32 entregables</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">54 entregables</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyCombinedTable.map((row, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-2 px-3 text-foreground">{row.month}</td>
                        <td className="py-2 px-3 text-foreground">{row.year}</td>
                        <td className="py-2 px-3 text-center font-bold text-primary">{row.termino || '—'}</td>
                        <td className="py-2 px-3 text-center font-bold text-info">{row.remision || '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-bold">
                      <td className="py-2 px-3 text-foreground" colSpan={2}>Total</td>
                      <td className="py-2 px-3 text-center text-primary">{monthlyCombinedTable.reduce((s, r) => s + r.termino, 0)}</td>
                      <td className="py-2 px-3 text-center text-info">{monthlyCombinedTable.reduce((s, r) => s + r.remision, 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly bar chart */}
            <div className="stat-card">
              <SectionHeader title="Carga de trabajo por mes — Comparativo 32 vs 54" description="Compara el total de actividades (32 principales) contra todos los entregables con fecha de Remisión al INE (54)." hint="Las barras moradas representan las 32 actividades principales por mes de término. Las azules incluyen las 22 sub-entregas adicionales con remisión al INE." icon={<BarChart3 className="w-4 h-4" />} chartId="prep-monthly-bar" />
              <div id="prep-monthly-bar">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={comparisonChartData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 16%, 88%)', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="prep32" name="Actividades PREP (32)" fill="hsl(320, 70%, 55%)" radius={[4, 4, 0, 0]} barSize={18}>
                      <LabelList dataKey="prep32" position="top" fill="hsl(320, 70%, 45%)" fontSize={10} fontWeight={700} />
                    </Bar>
                    <Bar dataKey="prep54" name="Actividades PREP (54)" fill="hsl(220, 70%, 60%)" radius={[4, 4, 0, 0]} barSize={18}>
                      <LabelList dataKey="prep54" position="top" fill="hsl(220, 70%, 50%)" fontSize={10} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Area progress */}
            <div className="stat-card">
              <SectionHeader title="Avance por área responsable" description="Cómo va cada área con sus entregables asignados." hint="Las áreas con más actividades requieren mayor seguimiento. El porcentaje muestra entregados respecto al total del área." icon={<Building className="w-4 h-4" />} xlsxData={areaXlsx} xlsxFilename="prep_avance_areas" />
              <div className="space-y-3">
                {Object.entries(areaGroups).sort((a, b) => b[1].total - a[1].total).map(([area, data]) => {
                  const pct = data.total > 0 ? Math.round((data.entregado / data.total) * 100) : 0;
                  return (
                    <div key={area} className="border-b border-border/30 pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-1.5 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-bold text-foreground truncate">{area}</span>
                          <Badge variant="outline" className="text-[10px]">{data.total} actividades</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs shrink-0">
                          <span className="text-success">{data.entregado} ✓</span>
                          <span className="text-info">{data.enProceso} ◐</span>
                          <span className="text-muted-foreground">{data.pendiente} =</span>
                          <span className="font-bold text-foreground w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming deadlines */}
            <div className="stat-card">
              <SectionHeader title="Próximos vencimientos" description="Las 10 actividades más cercanas a su fecha de término que aún no se entregan." icon={<Calendar className="w-4 h-4" />} xlsxData={upcomingXlsx} xlsxFilename="prep_proximos_vencimientos" />
              <div className="space-y-2">
                {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No hay próximos vencimientos.</p>}
                {upcoming.map((a) => {
                  const dias = Math.ceil((new Date(a.proyeccion.termino).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const fecha = new Date(a.proyeccion.termino + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground w-6 text-right">{a.entregable}</span>
                        <span className="text-sm text-foreground truncate">{a.actividad}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <span className={dias <= 30 ? 'text-destructive font-semibold' : dias <= 90 ? 'text-warning' : 'text-muted-foreground'}>{dias}d restantes</span>
                        <span className="text-muted-foreground">{fecha}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Histórico Tab */}
          <TabsContent value="historico" className="space-y-6 mt-4">
            {/* Executive summary histórico */}
            <div className="rounded-xl border border-info/20 bg-gradient-to-r from-info/5 to-primary/5 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-info/15 text-info flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-foreground">Resumen del histórico (2023–2025)</h2>
                  <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
                    {histStats.total === 0
                      ? 'No hay actividades registradas en el periodo histórico.'
                      : <>En el periodo se registraron <span className="font-semibold">{histStats.total}</span> actividades, además de <span className="font-semibold text-primary">{sessionSummary.cepaprep.extraordinarias + sessionSummary.cepaprep.ordinarias + sessionSummary.cepaprep.reuniones}</span> reuniones de CEPAPREP y <span className="font-semibold text-primary">{sessionSummary.cg.extraordinarias + sessionSummary.cg.ordinarias + sessionSummary.cg.reuniones}</span> del Consejo General.</>}
                  </p>
                </div>
              </div>
            </div>

            {/* Session Summary */}
            <div className="stat-card">
              <SectionHeader title="Resumen de sesiones" description="Sesiones y reuniones de trabajo realizadas por órgano." hint="Las sesiones extraordinarias atienden temas urgentes; las ordinarias están calendarizadas; las reuniones de trabajo son técnicas previas." icon={<Users className="w-4 h-4" />}
                xlsxData={[
                  { Órgano: "CEPAPREP", "Sesiones Extraordinarias": sessionSummary.cepaprep.extraordinarias, "Sesiones Ordinarias": sessionSummary.cepaprep.ordinarias, "Reuniones de Trabajo": sessionSummary.cepaprep.reuniones },
                  { Órgano: "Consejo General", "Sesiones Extraordinarias": sessionSummary.cg.extraordinarias, "Sesiones Ordinarias": sessionSummary.cg.ordinarias, "Reuniones de Trabajo": sessionSummary.cg.reuniones },
                ]}
                xlsxFilename="resumen_sesiones"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border/50 bg-muted/10">
                  <h3 className="text-sm font-bold text-foreground mb-3">CEPAPREP</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sesiones Extraordinarias</span><span className="font-bold text-foreground">{sessionSummary.cepaprep.extraordinarias}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sesiones Ordinarias</span><span className="font-bold text-foreground">{sessionSummary.cepaprep.ordinarias}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Reuniones de Trabajo</span><span className="font-bold text-foreground">{sessionSummary.cepaprep.reuniones}</span></div>
                    <div className="flex justify-between text-sm border-t border-border pt-2 mt-2"><span className="font-semibold text-foreground">Total</span><span className="font-bold text-primary">{sessionSummary.cepaprep.extraordinarias + sessionSummary.cepaprep.ordinarias + sessionSummary.cepaprep.reuniones}</span></div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-muted/10">
                  <h3 className="text-sm font-bold text-foreground mb-3">Consejo General</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sesiones Extraordinarias</span><span className="font-bold text-foreground">{sessionSummary.cg.extraordinarias}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sesiones Ordinarias</span><span className="font-bold text-foreground">{sessionSummary.cg.ordinarias}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Reuniones de Trabajo</span><span className="font-bold text-foreground">{sessionSummary.cg.reuniones}</span></div>
                    <div className="flex justify-between text-sm border-t border-border pt-2 mt-2"><span className="font-semibold text-foreground">Total</span><span className="font-bold text-primary">{sessionSummary.cg.extraordinarias + sessionSummary.cg.ordinarias + sessionSummary.cg.reuniones}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Histórico Pie by Year */}
            <div className="stat-card">
              <SectionHeader title="Actividades por año" description="Distribución de actividades históricas entre 2023, 2024 y 2025." hint="Cada porción representa el porcentaje del total de actividades cuyo término ocurrió en ese año." icon={<PieIcon className="w-4 h-4" />} chartId="historico-pie-year" />
              <div id="historico-pie-year">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={histPieByYear} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} dataKey="value">
                      {histPieByYear.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} actividades`, '']} />
                    <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Histórico Cumulative Chart */}
            <div className="stat-card">
              <SectionHeader title="Avance mes a mes (histórico)" description="Barras: actividades terminadas por mes. Línea verde: acumulado total." hint="Permite comparar la intensidad de trabajo mes a mes durante el periodo histórico." icon={<TrendingUp className="w-4 h-4" />} chartId="historico-cumulative-chart" />
              <div id="historico-cumulative-chart">
                <ResponsiveContainer width="100%" height={380}>
                  <ComposedChart data={historicoMonthly} margin={{ top: 30, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={{ stroke: 'hsl(220, 16%, 88%)' }} interval={1} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 16%, 88%)', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Bar dataKey="actividades" name="Actividades del Mes" fill="hsl(200, 70%, 50%)" radius={[4, 4, 0, 0]} barSize={24}>
                      <LabelList dataKey="actividades" position="top" fill="hsl(200, 70%, 40%)" fontSize={10} fontWeight={700} />
                    </Bar>
                    <Line dataKey="acumulado" name="Acumulado" stroke="hsl(152, 60%, 36%)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(152, 60%, 36%)', stroke: 'white', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Histórico monthly table */}
            <div className="stat-card">
              <SectionHeader title="Desglose mensual histórico" description="Cantidad de actividades terminadas por mes. Disponible para descarga en Excel." icon={<Calendar className="w-4 h-4" />} xlsxData={historicoXlsx} xlsxFilename="historico_desglose_mensual" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Mes</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Año</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Actividades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoMonthlyTable.map((row, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-2 px-3 text-foreground">{row.month}</td>
                        <td className="py-2 px-3 text-foreground">{row.year}</td>
                        <td className="py-2 px-3 text-center font-bold text-primary">{row.count}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-bold">
                      <td className="py-2 px-3 text-foreground" colSpan={2}>Total</td>
                      <td className="py-2 px-3 text-center text-primary">{histStats.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Histórico bar chart */}
            <div className="stat-card">
              <SectionHeader title="Carga histórica por mes" description="Visualización en barras de la actividad mensual del periodo histórico." icon={<BarChart3 className="w-4 h-4" />} chartId="historico-monthly-bar" />
              <div id="historico-monthly-bar">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={historicoMonthlyTable.map(r => ({ name: `${r.month.substring(0, 3)} ${r.year}`, actividades: r.count }))} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 16%, 88%)', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="actividades" name="Actividades" fill="hsl(200, 70%, 50%)" radius={[4, 4, 0, 0]} barSize={24}>
                      <LabelList dataKey="actividades" position="top" fill="hsl(200, 70%, 40%)" fontSize={10} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

      </Tabs>
    </TabsContent>

{/* HistÃ³rico Tab */}undefined