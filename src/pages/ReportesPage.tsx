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
import { FileText, BarChart3, AlertTriangle, Building, Calendar, TrendingUp, Users, Download, Image, RefreshCw, HelpCircle, Sparkles, CheckCircle2, Clock, Target, PieChart as PieIcon, GitCompareArrows, Package, Layers } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, BarChart, PieChart, Pie, Cell
} from "recharts";
import { exportTableToXlsx, exportChartAsImage } from "@/lib/exportUtils";
import { supabase } from "@/integrations/supabase/client";
import { entregables54 } from "@/data/entregables54";
import { entregables54Gantt } from "@/data/entregables54Gantt";
import { usePrepActivitiesWithSubs } from "@/hooks/usePrepActivitiesWithSubs";
import { useAuth } from "@/contexts/AuthContext";

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

// Generates the list of months from Sep 2026 to Jul 2027
function getMonthRange() {
  const months: { key: string; label: string }[] = [];
  let y = 2026, m = 8; // Sep 2026
  while (y < 2027 || (y === 2027 && m <= 6)) { // through Jul 2027
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    months.push({ key, label: `${MONTH_NAMES[m].substring(0, 3)} ${y}` });
    m++; if (m > 11) { m = 0; y++; }
  }
  return months;
}

export default function ReportesPage() {
  const { isInvitado } = useAuth();
  const [prepStatusOverrides, setPrepStatusOverrides] = useState<Record<number, ActivityStatus>>({});
  const [historicoStatusOverrides, setHistoricoStatusOverrides] = useState<Record<number, ActivityStatus>>({});
  const [customActivities, setCustomActivities] = useState<any[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [dateOverrides, setDateOverrides] = useState<Record<number, { inicio?: string; termino?: string }>>({});
  const [selectedMonth32, setSelectedMonth32] = useState<string>("all");
  const [selectedMonth54, setSelectedMonth54] = useState<string>("all");

  const { activities: unifiedActivities, loading: unifiedLoading, refetch: refetchUnified } = usePrepActivitiesWithSubs();

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
    await refetchUnified();
    setRefreshing(false);
  }, [refetchUnified]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ═══════════════════════════════════════════
  // PREP data (32 actividades principales)
  // ═══════════════════════════════════════════
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
            termino: dOv?.termino ?? (a.remisionINE2 || a.proyeccion.termino),
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

  // ═══════════════════════════════════════════
  // Datos de los 54 entregables (incluyendo sub-entregables)
  // ═══════════════════════════════════════════
  const all54Activities = useMemo(() => {
    return entregables54Gantt.map(ganttItem => {
      // Intentar empatar el estatus desde unifiedActivities
      let status: ActivityStatus = 'Pendiente';
      const cleanDesc = ganttItem.descripcion.trim().toLowerCase();
      
      const match = unifiedActivities.find(ua => ua.actividad.trim().toLowerCase() === cleanDesc);
      if (match) {
        status = match.status;
      } else {
        for (const ua of unifiedActivities) {
          const subMatch = ua.subActivities.find((sub: any) => sub.actividad.trim().toLowerCase() === cleanDesc);
          if (subMatch) {
            status = subMatch.status;
            break;
          }
        }
      }
      return {
        entregable: `${ganttItem.no}`,
        actividad: ganttItem.descripcion,
        inicio: ganttItem.inicio,
        termino: ganttItem.fin,
        status,
        areaResponsable: ganttItem.responsable,
        isMain: true,
        situacionCritica: undefined,
      };
    });
  }, [unifiedActivities]);

  // ═══════════════════════════════════════════
  // Histórico data
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // PREP 32 stats
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // PREP 54 stats
  // ═══════════════════════════════════════════
  const prep54Stats = useMemo(() => {
    let pendiente = 0, enProceso = 0, entregado = 0;
    all54Activities.forEach(a => {
      if (a.status === 'Entregado') entregado++;
      else if (a.status === 'En Proceso') enProceso++;
      else pendiente++;
    });
    return { total: all54Activities.length, pendiente, enProceso, entregado };
  }, [all54Activities]);

  const prep54Progress = prep54Stats.total > 0 ? Math.round((prep54Stats.entregado / prep54Stats.total) * 100) : 0;

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

  // ═══════════════════════════════════════════
  // PREP 32 area groups
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // PREP 54 area groups
  // ═══════════════════════════════════════════
  const areaGroups54 = useMemo(() => {
    const groups: Record<string, { total: number; entregado: number; enProceso: number; pendiente: number }> = {};
    for (const act of all54Activities) {
      const area = act.areaResponsable || 'Sin área';
      if (!groups[area]) groups[area] = { total: 0, entregado: 0, enProceso: 0, pendiente: 0 };
      groups[area].total++;
      if (act.status === 'Entregado') groups[area].entregado++;
      else if (act.status === 'En Proceso') groups[area].enProceso++;
      else groups[area].pendiente++;
    }
    return groups;
  }, [all54Activities]);

  const criticalActivities = prepActivities.filter(a => a.situacionCritica && a.situacionCritica.trim() !== '');
  const upcoming32 = [...prepActivities].filter(a => a.status !== 'Entregado' && a.proyeccion.termino).sort((a, b) => new Date(a.proyeccion.termino).getTime() - new Date(b.proyeccion.termino).getTime()).slice(0, 10);

  const upcoming54 = useMemo(() => {
    return [...all54Activities]
      .filter(a => a.status !== 'Entregado' && a.termino)
      .sort((a, b) => new Date(a.termino).getTime() - new Date(b.termino).getTime())
      .slice(0, 10);
  }, [all54Activities]);

  // ═══════════════════════════════════════════
  // Monthly data for 32 entregables (Remisión al INE)
  // ═══════════════════════════════════════════
  const monthlyData32 = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    for (const e of entregables54.filter(e => e.isMain && e.termino32)) {
      const [yy, mm] = e.termino32!.split('-');
      const key = `${yy}-${mm}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    const months = getMonthRange();
    let cumulative = 0;
    const total = 32;
    
    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    return months.map((month) => {
      const count = monthCounts[month.key] || 0;
      cumulative += count;
      
      const actsInMonth = prepActivities.filter(a => a.proyeccion.termino?.startsWith(month.key));
      const isCompleted = count > 0 && actsInMonth.length > 0 && actsInMonth.every(a => a.status === 'Entregado');
      const isCurrent = month.key === currentMonthKey;
      
      return { key: month.key, name: month.label, actividades: count, acumulado: cumulative, objetivo: total, porcentaje: `${Math.min(100, Math.round((cumulative / total) * 100))}%`, isCurrent, isCompleted };
    });
  }, [prepActivities]);

  // ═══════════════════════════════════════════
  // Monthly data for 54 entregables (Remisión al INE)
  // ═══════════════════════════════════════════
  const monthlyData54 = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    for (const e of entregables54Gantt) {
      const [yy, mm] = e.fin.split('-');
      const key = `${yy}-${mm}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    const months = getMonthRange();
    let cumulative = 0;
    const total = entregables54Gantt.length;
    
    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    return months.map((month) => {
      const count = monthCounts[month.key] || 0;
      cumulative += count;
      
      const actsInMonth = all54Activities.filter(a => a.termino?.startsWith(month.key));
      const isCompleted = count > 0 && actsInMonth.length > 0 && actsInMonth.every(a => a.status === 'Entregado');
      const isCurrent = month.key === currentMonthKey;
      
      return { key: month.key, name: month.label, actividades: count, acumulado: cumulative, objetivo: total, porcentaje: `${Math.min(100, Math.round((cumulative / total) * 100))}%`, isCurrent, isCompleted };
    });
  }, [all54Activities]);

  // Monthly breakdown table for 32
  const prepMonthlyTable32 = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    for (const e of entregables54.filter(e => e.isMain && e.termino32)) {
      const [yy, mm] = e.termino32!.split('-');
      const key = `${yy}-${mm}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    let cumulative = 0;
    const total = 32;
    return getMonthRange().map(m => {
      const [yy, mm] = m.key.split('-');
      const count = monthCounts[m.key] || 0;
      cumulative += count;
      return { 
        key: m.key, 
        month: MONTH_NAMES[parseInt(mm, 10) - 1], 
        year: parseInt(yy, 10), 
        count,
        acumulado: cumulative,
        porcentaje: `${Math.min(100, Math.round((cumulative / total) * 100))}%`
      };
    });
  }, []);

  // Monthly breakdown table for 54
  const prepMonthlyTable54 = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    for (const e of entregables54Gantt) {
      const [yy, mm] = e.fin.split('-');
      const key = `${yy}-${mm}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    let cumulative = 0;
    const total = entregables54Gantt.length;
    return getMonthRange().map(m => {
      const [yy, mm] = m.key.split('-');
      const count = monthCounts[m.key] || 0;
      cumulative += count;
      return { 
        key: m.key, 
        month: MONTH_NAMES[parseInt(mm, 10) - 1], 
        year: parseInt(yy, 10), 
        count,
        acumulado: cumulative,
        porcentaje: `${Math.min(100, Math.round((cumulative / total) * 100))}%`
      };
    });
  }, []);

  // Side-by-side table: 32 main entregables vs all 54
  const monthlyCombinedTable = useMemo(() => {
    const map32: Record<string, number> = {};
    const map54: Record<string, number> = {};
    for (const e of entregables54.filter(e => e.isMain && e.termino32)) {
      const [yy, mm] = e.termino32!.split('-');
      map32[`${yy}-${mm}`] = (map32[`${yy}-${mm}`] || 0) + 1;
    }
    for (const e of entregables54Gantt) {
      const [yy, mm] = e.fin.split('-');
      map54[`${yy}-${mm}`] = (map54[`${yy}-${mm}`] || 0) + 1;
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
    for (const e of entregables54.filter(e => e.isMain && e.termino32)) {
      const [yy, mm] = e.termino32!.split('-');
      const key = `${yy}-${mm}`;
      map32[key] = (map32[key] || 0) + 1;
    }
    const map54: Record<string, number> = {};
    for (const e of entregables54Gantt) {
      const [yy, mm] = e.fin.split('-');
      const key = `${yy}-${mm}`;
      map54[key] = (map54[key] || 0) + 1;
    }
    const months = getMonthRange();
    return months.map(mo => ({
      name: mo.label,
      prep32: map32[mo.key] || 0,
      prep54: map54[mo.key] || 0,
    }));
  }, []);

  // ═══════════════════════════════════════════
  // Pie charts for 32
  // ═══════════════════════════════════════════
  const prepPieByYear = useMemo(() => {
    const yearCounts: Record<number, number> = {};
    for (const act of prepActivities) {
      if (!act.proyeccion.termino) continue;
      const y = new Date(act.proyeccion.termino).getFullYear();
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
    return Object.entries(yearCounts).map(([year, count]) => ({ name: year, value: count })).sort((a, b) => Number(a.name) - Number(b.name));
  }, [prepActivities]);

  const prepPieByStatus = useMemo(() => {
    return [
      { name: 'Pendiente', value: prepStats.pendiente },
      { name: 'En Proceso', value: prepStats.enProceso },
      { name: 'Entregado', value: prepStats.entregado },
    ].filter(d => d.value > 0);
  }, [prepStats]);

  // ═══════════════════════════════════════════
  // Pie charts for 54
  // ═══════════════════════════════════════════
  const prep54PieByYear = useMemo(() => {
    const yearCounts: Record<number, number> = {};
    for (const act of all54Activities) {
      if (!act.termino) continue;
      const y = new Date(act.termino + 'T00:00:00').getFullYear();
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
    return Object.entries(yearCounts).map(([year, count]) => ({ name: year, value: count })).sort((a, b) => Number(a.name) - Number(b.name));
  }, [all54Activities]);

  const prep54PieByStatus = useMemo(() => {
    return [
      { name: 'Pendiente', value: prep54Stats.pendiente },
      { name: 'En Proceso', value: prep54Stats.enProceso },
      { name: 'Entregado', value: prep54Stats.entregado },
    ].filter(d => d.value > 0);
  }, [prep54Stats]);

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

  const CustomAccumulatedLabel32 = (props: any) => {
    const { x, y, value } = props;
    const pct = `${Math.min(100, Math.round((Number(value) / 32) * 100))}%`;
    return (
      <g>
        <rect x={x - 20} y={y - 22} width={40} height={18} rx={3} fill="hsl(152, 60%, 36%)" />
        <text x={x} y={y - 10} textAnchor="middle" fill="white" fontSize={10} fontWeight={600}>{pct}</text>
      </g>
    );
  };

  const CustomAccumulatedLabel54 = (props: any) => {
    const { x, y, value } = props;
    const total54 = entregables54Gantt.length;
    const pct = `${Math.min(100, Math.round((Number(value) / total54) * 100))}%`;
    return (
      <g>
        <rect x={x - 20} y={y - 22} width={40} height={18} rx={3} fill="hsl(152, 60%, 36%)" />
        <text x={x} y={y - 10} textAnchor="middle" fill="white" fontSize={10} fontWeight={600}>{pct}</text>
      </g>
    );
  };

  const CustomBarLabel = (props: any) => {
    const { x, y, width, value, payload } = props;
    if (value === 0) return null;
    return (
      <g>
        <text x={x + width / 2} y={y - 5} textAnchor="middle" fill={payload?.isCurrent ? "hsl(200, 70%, 50%)" : (payload?.isCompleted ? "hsl(152, 60%, 40%)" : "hsl(330, 70%, 60%)")} fontSize={11} fontWeight={700}>
          {value}
        </text>
        {payload?.isCompleted && (
          <text x={x + width / 2 + 12} y={y - 12} textAnchor="middle" fill="hsl(152, 60%, 40%)" fontSize={14} fontWeight="bold">✓</text>
        )}
      </g>
    );
  };

  const CustomBarLabel54 = (props: any) => {
    const { x, y, width, value, payload } = props;
    if (value === 0) return null;
    return (
      <g>
        <text x={x + width / 2} y={y - 5} textAnchor="middle" fill={payload?.isCurrent ? "hsl(200, 70%, 50%)" : (payload?.isCompleted ? "hsl(152, 60%, 40%)" : "hsl(330, 70%, 60%)")} fontSize={11} fontWeight={700}>
          {value}
        </text>
        {payload?.isCompleted && (
          <text x={x + width / 2 + 12} y={y - 12} textAnchor="middle" fill="hsl(152, 60%, 40%)" fontSize={14} fontWeight="bold">✓</text>
        )}
      </g>
    );
  };

  const STATUS_COLORS = ["hsl(38, 92%, 50%)", "hsl(200, 70%, 50%)", "hsl(152, 60%, 36%)"];

  // XLSX exports
  const prepXlsx32 = prepMonthlyTable32.map(r => ({ Mes: r.month, Año: r.year, "Entregables": r.count }));
  const prepXlsx54 = prepMonthlyTable54.map(r => ({ Mes: r.month, Año: r.year, "Entregables": r.count }));
  const compXlsx = monthlyCombinedTable.map(r => ({ Mes: r.month, Año: r.year, "32 entregables": r.termino, "54 entregables": r.remision }));
  const historicoXlsx = historicoMonthlyTable.map(r => ({ Mes: r.month, Año: r.year, Actividades: r.count }));
  const upcoming32Xlsx = upcoming32.map(a => ({
    Entregable: a.entregable, Actividad: a.actividad, Área: a.areaResponsable,
    Término: a.proyeccion.termino ? new Date(a.proyeccion.termino).toLocaleDateString('es-MX') : '',
    Estado: a.status,
  }));
  const upcoming54Xlsx = upcoming54.map(a => ({
    Entregable: a.entregable, Actividad: a.actividad, Área: a.areaResponsable,
    Término: a.termino ? new Date(a.termino).toLocaleDateString('es-MX') : '',
    Estado: a.status,
  }));
  const areaXlsx = Object.entries(areaGroups).map(([area, d]) => ({
    Área: area, Total: d.total, Entregados: d.entregado, "En Proceso": d.enProceso, Pendientes: d.pendiente,
    "Avance %": d.total > 0 ? Math.round((d.entregado / d.total) * 100) : 0,
  }));
  const areaXlsx54 = Object.entries(areaGroups54).map(([area, d]) => ({
    Área: area, Total: d.total, Entregados: d.entregado, "En Proceso": d.enProceso, Pendientes: d.pendiente,
    "Avance %": d.total > 0 ? Math.round((d.entregado / d.total) * 100) : 0,
  }));

  // ═══════════════════════════════════════════
  // Comparison KPIs
  // ═══════════════════════════════════════════
  const comparisonKpis = useMemo(() => ({
    total32: prepStats.total,
    total54: prep54Stats.total,
    entregado32: prepStats.entregado,
    entregado54: prep54Stats.entregado,
    enProceso32: prepStats.enProceso,
    enProceso54: prep54Stats.enProceso,
    pendiente32: prepStats.pendiente,
    pendiente54: prep54Stats.pendiente,
    progress32: prepProgress,
    progress54: prep54Progress,
  }), [prepStats, prep54Stats, prepProgress, prep54Progress]);

  // ═══════════════════════════════════════════
  // Reusable section renderers
  // ═══════════════════════════════════════════

  // Renders executive summary
  const renderExecutiveSummary = (stats: typeof prepStats, progress: number, critCount: number, label: string, total: number) => (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-info/5 p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Target className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Resumen ejecutivo — {label}</h2>
          <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
            Llevamos un <span className="font-semibold text-primary">{progress}%</span> de avance:{" "}
            <span className="font-semibold text-success">{stats.entregado} entregadas</span>,{" "}
            <span className="font-semibold text-info">{stats.enProceso} en proceso</span> y{" "}
            <span className="font-semibold text-warning">{stats.pendiente} pendientes</span> de un total de <span className="font-semibold">{stats.total}</span>.
            {critCount > 0 && <> Hay <span className="font-semibold text-destructive">{critCount} situaciones críticas</span> que requieren atención.</>}
          </p>
        </div>
      </div>
    </div>
  );

  // Renders KPI cards
  const renderKpiCards = (stats: typeof prepStats, progress: number, critCount: number) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center"><BarChart3 className="w-4 h-4" /></div>
          <h3 className="text-xs font-semibold text-foreground">¿Cómo vamos en general?</h3>
        </div>
        <div className="text-2xl font-bold text-foreground">{progress}%</div>
        <Progress value={progress} className="h-1.5 mt-2" />
        <p className="text-[11px] text-muted-foreground mt-2">Porcentaje de entregables completados</p>
      </div>
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-md bg-info/10 text-info flex items-center justify-center"><FileText className="w-4 h-4" /></div>
          <h3 className="text-xs font-semibold text-foreground">Entregables totales</h3>
        </div>
        <div className="text-2xl font-bold text-foreground">{stats.total}</div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant="outline" className="text-[10px] gap-1"><CheckCircle2 className="w-3 h-3 text-success" />{stats.entregado} entregados</Badge>
          <Badge variant="outline" className="text-[10px] gap-1"><Clock className="w-3 h-3 text-info" />{stats.enProceso} en proceso</Badge>
          <Badge variant="outline" className="text-[10px] gap-1">{stats.pendiente} pendientes</Badge>
        </div>
      </div>
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-md bg-warning/10 text-warning flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></div>
          <h3 className="text-xs font-semibold text-foreground">Requieren atención</h3>
        </div>
        <div className="text-2xl font-bold text-foreground">{critCount}</div>
        <p className="text-[11px] text-muted-foreground mt-2">Actividades marcadas como situación crítica</p>
      </div>
    </div>
  );

  // Renders pie charts (year + status)
  const renderPieCharts = (pieByYear: any[], pieByStatus: any[], idPrefix: string) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="stat-card">
        <SectionHeader title="Actividades por año" description="Cómo se distribuyen los entregables entre 2026 y 2027." hint="Cada porción muestra el porcentaje de actividades cuyo término ocurre en ese año." icon={<PieIcon className="w-4 h-4" />} chartId={`${idPrefix}-pie-year`} />
        <div id={`${idPrefix}-pie-year`}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieByYear} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} dataKey="value">
                {pieByYear.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} actividades`, '']} />
              <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="stat-card">
        <SectionHeader title="Actividades por estatus" description="Distribución actual entre pendientes, en proceso y entregadas." hint="Vista rápida del estado general del proyecto." icon={<PieIcon className="w-4 h-4" />} chartId={`${idPrefix}-pie-status`} />
        <div id={`${idPrefix}-pie-status`}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieByStatus} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} dataKey="value">
                {pieByStatus.map((d, i) => <Cell key={i} fill={STATUS_COLORS[["Pendiente","En Proceso","Entregado"].indexOf(d.name)] || PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} actividades`, '']} />
              <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // Renders area progress
  const renderAreaProgress = (groups: typeof areaGroups, xlsxDataForAreas: any[], filenamePrefix: string) => (
    <div className="stat-card">
      <SectionHeader title="Avance por área responsable" description="Cómo va cada área con sus entregables asignados." hint="Las áreas con más actividades requieren mayor seguimiento. El porcentaje muestra entregados respecto al total del área." icon={<Building className="w-4 h-4" />} xlsxData={xlsxDataForAreas} xlsxFilename={`${filenamePrefix}_avance_areas`} />
      <div className="space-y-3">
        {Object.entries(groups).sort((a, b) => b[1].total - a[1].total).map(([area, data]) => {
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
  );

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
          {!isInvitado && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prep">PREP 26-27</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
          )}

          {/* PREP Tab */}
          <TabsContent value="prep" className="space-y-6 mt-4">
            {/* Sub-tabs for 32 / 54 / Comparativo */}
            <Tabs defaultValue="ent32" className="w-full">
              {!isInvitado ? (
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  <TabsTrigger value="ent32" className="gap-2 text-xs sm:text-sm py-2">
                    <Package className="w-4 h-4 hidden sm:inline" />
                    32 Entregables
                  </TabsTrigger>
                  <TabsTrigger value="ent54" className="gap-2 text-xs sm:text-sm py-2">
                    <Layers className="w-4 h-4 hidden sm:inline" />
                    54 Entregables
                  </TabsTrigger>
                  <TabsTrigger value="comparativo" className="gap-2 text-xs sm:text-sm py-2">
                    <GitCompareArrows className="w-4 h-4 hidden sm:inline" />
                    Comparativo
                  </TabsTrigger>
                </TabsList>
              ) : (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">32 Entregables Principales</span>
                </div>
              )}

              {/* ══════════════════════════════════════ */}
              {/* SUB-TAB: 32 ENTREGABLES              */}
              {/* ══════════════════════════════════════ */}
              <TabsContent value="ent32" className="space-y-6 mt-4">
                {renderExecutiveSummary(prepStats, prepProgress, criticalActivities.length, "32 Entregables Principales", 32)}
                {renderKpiCards(prepStats, prepProgress, criticalActivities.length)}
                {renderPieCharts(prepPieByYear, prepPieByStatus, "prep32")}

                {/* Cumulative monthly progress */}
                <div className="stat-card">
                  <SectionHeader title="¿Cómo avanzamos mes a mes?" description="Barras: actividades que terminan ese mes. Línea verde: avance acumulado. Línea punteada: meta total (32)." hint="Permite ver el ritmo esperado de entregas y el progreso acumulado hacia la meta de 32 actividades." icon={<TrendingUp className="w-4 h-4" />} chartId="prep32-cumulative-chart" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">Ver mes:</span>
                    <Select value={selectedMonth32} onValueChange={setSelectedMonth32}>
                      <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los meses</SelectItem>
                        {monthlyData32.map(m => <SelectItem key={m.key} value={m.key}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div id="prep32-cumulative-chart">
                    <ResponsiveContainer width="100%" height={500}>
                      <ComposedChart data={selectedMonth32 === 'all' ? monthlyData32 : monthlyData32.filter(m => m.key === selectedMonth32)} margin={{ top: 30, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={{ stroke: 'hsl(220, 16%, 88%)' }} interval={0} />
                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} domain={[0, 32]} ticks={[0, 8, 16, 24, 32]} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 16%, 88%)', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                        <Line yAxisId="right" dataKey="objetivo" name="Meta (32)" stroke="hsl(220, 10%, 60%)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                        <Bar yAxisId="left" dataKey="actividades" name="Actividades del Mes" fill="hsl(330, 70%, 60%)" radius={[4, 4, 0, 0]} barSize={50}>
                          {(selectedMonth32 === 'all' ? monthlyData32 : monthlyData32.filter(m => m.key === selectedMonth32)).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry?.isCurrent ? "hsl(200, 70%, 50%)" : (entry?.isCompleted ? "hsl(152, 60%, 40%)" : "hsl(330, 70%, 60%)")} />
                          ))}
                          <LabelList content={CustomBarLabel} />
                        </Bar>
                        <Line yAxisId="right" dataKey="acumulado" name="Acumulado" stroke="hsl(152, 60%, 36%)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(152, 60%, 36%)', stroke: 'white', strokeWidth: 2 }}>
                          <LabelList content={CustomAccumulatedLabel32} />
                        </Line>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly breakdown table for 32 */}
                <div className="stat-card">
                  <SectionHeader title="Desglose mensual — 32 Entregables" description="Entregables principales por mes según la fecha de Remisión al INE." icon={<Calendar className="w-4 h-4" />} xlsxData={prepXlsx32} xlsxFilename="prep_32_desglose_mensual" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Mes</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Año</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Entregables</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Acumulado (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prepMonthlyTable32.map((row, i) => (
                          <tr key={i} className="border-b border-border/30">
                            <td className="py-2 px-3 text-foreground">{row.month}</td>
                            <td className="py-2 px-3 text-foreground">{row.year}</td>
                            <td className="py-2 px-3 text-center font-bold text-primary">{row.count || '—'}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground font-medium">{row.porcentaje}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/30 font-bold">
                          <td className="py-2 px-3 text-foreground" colSpan={2}>Total</td>
                          <td className="py-2 px-3 text-center text-primary">{prepMonthlyTable32.reduce((s, r) => s + r.count, 0)}</td>
                          <td className="py-2 px-3 text-center text-muted-foreground">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {renderAreaProgress(areaGroups, areaXlsx, "prep32")}

                {/* Upcoming deadlines for 32 */}
                <div className="stat-card">
                  <SectionHeader title="Próximos vencimientos" description="Las 10 actividades más cercanas a su fecha de término que aún no se entregan." icon={<Calendar className="w-4 h-4" />} xlsxData={upcoming32Xlsx} xlsxFilename="prep32_proximos_vencimientos" />
                  <div className="space-y-2">
                    {upcoming32.length === 0 && <p className="text-sm text-muted-foreground">No hay próximos vencimientos.</p>}
                    {upcoming32.map((a) => {
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

              {/* ══════════════════════════════════════ */}
              {/* SUB-TAB: 54 ENTREGABLES              */}
              {/* ══════════════════════════════════════ */}
              {!isInvitado && (
              <TabsContent value="ent54" className="space-y-6 mt-4">
                {renderExecutiveSummary(prep54Stats, prep54Progress, 0, "54 Entregables (incluye sub-entregables)", entregables54Gantt.length)}
                {renderKpiCards(prep54Stats, prep54Progress, 0)}
                {renderPieCharts(prep54PieByYear, prep54PieByStatus, "prep54")}

                {/* Cumulative monthly progress for 54 */}
                <div className="stat-card">
                  <SectionHeader title="¿Cómo avanzamos mes a mes?" description={`Barras: entregables que terminan ese mes. Línea verde: avance acumulado. Línea punteada: meta total (${entregables54Gantt.length}).`} hint="Permite ver el ritmo esperado de entregas y el progreso acumulado hacia la meta de los 54 entregables." icon={<TrendingUp className="w-4 h-4" />} chartId="prep54-cumulative-chart" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">Ver mes:</span>
                    <Select value={selectedMonth54} onValueChange={setSelectedMonth54}>
                      <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los meses</SelectItem>
                        {monthlyData54.map(m => <SelectItem key={m.key} value={m.key}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div id="prep54-cumulative-chart">
                    <ResponsiveContainer width="100%" height={500}>
                      <ComposedChart data={selectedMonth54 === 'all' ? monthlyData54 : monthlyData54.filter(m => m.key === selectedMonth54)} margin={{ top: 30, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={{ stroke: 'hsl(220, 16%, 88%)' }} interval={0} />
                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} domain={[0, entregables54Gantt.length]} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 16%, 88%)', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                        <Line yAxisId="right" dataKey="objetivo" name={`Meta (${entregables54Gantt.length})`} stroke="hsl(220, 10%, 60%)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                        <Bar yAxisId="left" dataKey="actividades" name="Entregables del Mes" fill="hsl(330, 70%, 60%)" radius={[4, 4, 0, 0]} barSize={50}>
                          {(selectedMonth54 === 'all' ? monthlyData54 : monthlyData54.filter(m => m.key === selectedMonth54)).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry?.isCurrent ? "hsl(200, 70%, 50%)" : (entry?.isCompleted ? "hsl(152, 60%, 40%)" : "hsl(330, 70%, 60%)")} />
                          ))}
                          <LabelList content={CustomBarLabel54} />
                        </Bar>
                        <Line yAxisId="right" dataKey="acumulado" name="Acumulado" stroke="hsl(152, 60%, 36%)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(152, 60%, 36%)', stroke: 'white', strokeWidth: 2 }}>
                          <LabelList content={CustomAccumulatedLabel54} />
                        </Line>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly breakdown table for 54 */}
                <div className="stat-card">
                  <SectionHeader title="Desglose mensual — 54 Entregables" description="Todos los entregables (incluyendo sub-entregables) por mes según la fecha de Remisión al INE." icon={<Calendar className="w-4 h-4" />} xlsxData={prepXlsx54} xlsxFilename="prep_54_desglose_mensual" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Mes</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Año</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Entregables</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Acumulado (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prepMonthlyTable54.map((row, i) => (
                          <tr key={i} className="border-b border-border/30">
                            <td className="py-2 px-3 text-foreground">{row.month}</td>
                            <td className="py-2 px-3 text-foreground">{row.year}</td>
                            <td className="py-2 px-3 text-center font-bold text-info">{row.count || '—'}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground font-medium">{row.porcentaje}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/30 font-bold">
                          <td className="py-2 px-3 text-foreground" colSpan={2}>Total</td>
                          <td className="py-2 px-3 text-center text-info">{prepMonthlyTable54.reduce((s, r) => s + r.count, 0)}</td>
                          <td className="py-2 px-3 text-center text-muted-foreground">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {renderAreaProgress(areaGroups54, areaXlsx54, "prep54")}

                {/* Upcoming deadlines for 54 */}
                <div className="stat-card">
                  <SectionHeader title="Próximos vencimientos" description="Las 10 actividades más cercanas a su fecha de término que aún no se entregan (incluyendo sub-entregables)." icon={<Calendar className="w-4 h-4" />} xlsxData={upcoming54Xlsx} xlsxFilename="prep54_proximos_vencimientos" />
                  <div className="space-y-2">
                    {upcoming54.length === 0 && <p className="text-sm text-muted-foreground">No hay próximos vencimientos.</p>}
                    {upcoming54.map((a, idx) => {
                      const dias = Math.ceil((new Date(a.termino).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const fecha = new Date(a.termino + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
                      return (
                        <div key={`${a.entregable}-${idx}`} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-xs text-muted-foreground w-8 text-right">{a.entregable}</span>
                            <span className="text-sm text-foreground truncate">{a.actividad}</span>
                            {!a.isMain && <Badge variant="outline" className="text-[9px] shrink-0">Sub</Badge>}
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
              )}

              {!isInvitado && (
              <TabsContent value="comparativo" className="space-y-6 mt-4">
                {/* Comparison executive summary */}
                <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-info/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <GitCompareArrows className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-sm font-semibold text-foreground">Comparativo — 32 vs 54 Entregables</h2>
                      <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
                        Los <span className="font-semibold text-primary">32 entregables principales</span> tienen un avance de <span className="font-semibold text-primary">{comparisonKpis.progress32}%</span>, mientras que
                        los <span className="font-semibold text-info">54 entregables totales</span> (incluyendo sub-entregables) tienen un avance de <span className="font-semibold text-info">{comparisonKpis.progress54}%</span>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comparison KPI cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="stat-card border-l-4 border-l-primary">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">32 Entregables Principales</h3>
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2">{comparisonKpis.progress32}%</div>
                    <Progress value={comparisonKpis.progress32} className="h-2 mb-3" />
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-[10px] gap-1"><CheckCircle2 className="w-3 h-3 text-success" />{comparisonKpis.entregado32} entregados</Badge>
                      <Badge variant="outline" className="text-[10px] gap-1"><Clock className="w-3 h-3 text-info" />{comparisonKpis.enProceso32} en proceso</Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">{comparisonKpis.pendiente32} pendientes</Badge>
                    </div>
                  </div>
                  <div className="stat-card border-l-4 border-l-info">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-5 h-5 text-info" />
                      <h3 className="text-sm font-bold text-foreground">54 Entregables Totales</h3>
                    </div>
                    <div className="text-3xl font-bold text-info mb-2">{comparisonKpis.progress54}%</div>
                    <Progress value={comparisonKpis.progress54} className="h-2 mb-3" />
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-[10px] gap-1"><CheckCircle2 className="w-3 h-3 text-success" />{comparisonKpis.entregado54} entregados</Badge>
                      <Badge variant="outline" className="text-[10px] gap-1"><Clock className="w-3 h-3 text-info" />{comparisonKpis.enProceso54} en proceso</Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">{comparisonKpis.pendiente54} pendientes</Badge>
                    </div>
                  </div>
                </div>

                {/* Comparison pie charts: status side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="stat-card">
                    <SectionHeader title="Estatus — 32 Entregables" icon={<PieIcon className="w-4 h-4" />} chartId="comp-pie-32" />
                    <div id="comp-pie-32">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={prepPieByStatus} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={90} dataKey="value">
                            {prepPieByStatus.map((d, i) => <Cell key={i} fill={STATUS_COLORS[["Pendiente","En Proceso","Entregado"].indexOf(d.name)] || PIE_COLORS[i]} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`${value} actividades`, '']} />
                          <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="stat-card">
                    <SectionHeader title="Estatus — 54 Entregables" icon={<PieIcon className="w-4 h-4" />} chartId="comp-pie-54" />
                    <div id="comp-pie-54">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={prep54PieByStatus} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={90} dataKey="value">
                            {prep54PieByStatus.map((d, i) => <Cell key={i} fill={STATUS_COLORS[["Pendiente","En Proceso","Entregado"].indexOf(d.name)] || PIE_COLORS[i]} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`${value} actividades`, '']} />
                          <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Monthly comparison table */}
                <div className="stat-card">
                  <SectionHeader title="Desglose mensual comparativo" description="Entregables por mes según la fecha de Remisión al INE. Comparativo entre los 32 entregables principales y los 54 totales." icon={<Calendar className="w-4 h-4" />} xlsxData={compXlsx} xlsxFilename="prep_comparativo_mensual" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Mes</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Año</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">32 entregables</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">54 entregables</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Diferencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyCombinedTable.map((row, i) => (
                          <tr key={i} className="border-b border-border/30">
                            <td className="py-2 px-3 text-foreground">{row.month}</td>
                            <td className="py-2 px-3 text-foreground">{row.year}</td>
                            <td className="py-2 px-3 text-center font-bold text-primary">{row.termino || '—'}</td>
                            <td className="py-2 px-3 text-center font-bold text-info">{row.remision || '—'}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground font-medium">{row.remision - row.termino > 0 ? `+${row.remision - row.termino}` : '—'}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/30 font-bold">
                          <td className="py-2 px-3 text-foreground" colSpan={2}>Total</td>
                          <td className="py-2 px-3 text-center text-primary">{monthlyCombinedTable.reduce((s, r) => s + r.termino, 0)}</td>
                          <td className="py-2 px-3 text-center text-info">{monthlyCombinedTable.reduce((s, r) => s + r.remision, 0)}</td>
                          <td className="py-2 px-3 text-center text-muted-foreground">{monthlyCombinedTable.reduce((s, r) => s + r.remision, 0) - monthlyCombinedTable.reduce((s, r) => s + r.termino, 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Comparison bar chart */}
                <div className="stat-card">
                  <SectionHeader title="Carga de trabajo por mes — 32 vs 54" description="Compara el total de actividades principales (32) contra todos los entregables con fecha de Remisión al INE (54)." hint="Las barras moradas representan las 32 actividades principales. Las azules incluyen las sub-entregas adicionales." icon={<BarChart3 className="w-4 h-4" />} chartId="comp-monthly-bar" />
                  <div id="comp-monthly-bar">
                    <ResponsiveContainer width="100%" height={450}>
                      <BarChart data={comparisonChartData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} interval={0} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 16%, 88%)', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="prep32" name="32 Entregables" fill="hsl(320, 70%, 55%)" radius={[4, 4, 0, 0]} barSize={35}>
                          <LabelList dataKey="prep32" position="top" fill="hsl(320, 70%, 45%)" fontSize={10} fontWeight={700} />
                        </Bar>
                        <Bar dataKey="prep54" name="54 Entregables" fill="hsl(220, 70%, 60%)" radius={[4, 4, 0, 0]} barSize={35}>
                          <LabelList dataKey="prep54" position="top" fill="hsl(220, 70%, 50%)" fontSize={10} fontWeight={700} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>
              )}
            </Tabs>
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
                <ResponsiveContainer width="100%" height={500}>
                  <ComposedChart data={historicoMonthly} margin={{ top: 30, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={{ stroke: 'hsl(220, 16%, 88%)' }} interval={1} />
                    <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 16%, 88%)', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Bar yAxisId="left" dataKey="actividades" name="Actividades del Mes" fill="hsl(200, 70%, 50%)" radius={[4, 4, 0, 0]} barSize={50}>
                      <LabelList dataKey="actividades" position="top" fill="hsl(200, 70%, 40%)" fontSize={10} fontWeight={700} />
                    </Bar>
                    <Line yAxisId="right" dataKey="acumulado" name="Acumulado" stroke="hsl(152, 60%, 36%)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(152, 60%, 36%)', stroke: 'white', strokeWidth: 2 }} />
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
