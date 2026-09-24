import { useMemo, useState, useEffect, useCallback } from "react";
import { activities } from "@/data/activities";
import { sessions } from "@/data/sessions";
import { ActivityStatus } from "@/data/types";
import { Button } from "@/components/ui/button";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, BarChart, PieChart, Pie, Cell,
} from "recharts";
import { FileText, BarChart3, Calendar, TrendingUp, Users, Download, Image, Target, PieChart as PieIcon } from "lucide-react";
import { exportTableToXlsx, exportChartAsImage } from "@/lib/exportUtils";
import { supabase } from "@/integrations/supabase/client";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const PIE_COLORS = ["hsl(270, 60%, 60%)", "hsl(200, 70%, 50%)", "hsl(152, 60%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 70%, 50%)"];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function SectionHeader({ title, icon, description, chartId, xlsxData, xlsxFilename }: {
  title: string; icon: React.ReactNode; description?: string;
  chartId?: string; xlsxData?: Record<string, unknown>[]; xlsxFilename?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-4 gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
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

export default function HistoricoReporte() {
  const [statusOverrides, setStatusOverrides] = useState<Record<number, ActivityStatus>>({});

  const fetchOverrides = useCallback(async () => {
    const { data } = await supabase.from("activity_status").select("activity_id, status").eq("section", "historico");
    if (data) {
      const map: Record<number, ActivityStatus> = {};
      data.forEach((r: { activity_id: number; status: string }) => { map[r.activity_id] = r.status as ActivityStatus; });
      setStatusOverrides(map);
    }
  }, []);
  useEffect(() => { fetchOverrides(); }, [fetchOverrides]);

  const historicoActivities = useMemo(() => {
    return activities
      .filter((a) => {
        const y = new Date(a.historico.inicio).getFullYear();
        const yEnd = new Date(a.historico.termino).getFullYear();
        return (y >= 2023 && y <= 2025) || (yEnd >= 2023 && yEnd <= 2025);
      })
      .map((a) => ({ ...a, status: (statusOverrides[a.id] ?? a.status) as ActivityStatus }));
  }, [statusOverrides]);

  const histStats = useMemo(() => {
    let pendiente = 0, enProceso = 0, entregado = 0;
    historicoActivities.forEach((a) => {
      if (a.status === "Entregado") entregado++;
      else if (a.status === "En Proceso") enProceso++;
      else pendiente++;
    });
    return { total: historicoActivities.length, pendiente, enProceso, entregado };
  }, [historicoActivities]);

  const historicoMonthly = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    for (const act of historicoActivities) {
      if (!act.historico.termino) continue;
      const end = new Date(act.historico.termino);
      const key = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    const months: { key: string; label: string }[] = [];
    let y = 2023, m = 7;
    while (y < 2025 || (y === 2025 && m <= 6)) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
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
      const key = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
      if (!data[key]) data[key] = { month: MONTH_NAMES[end.getMonth()], year: end.getFullYear(), count: 0 };
      data[key].count++;
    }
    return Object.values(data).sort((a, b) => (a.year !== b.year ? a.year - b.year : MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month)));
  }, [historicoActivities]);

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
      const org = s.organo === "CEPAPREP" ? "cepaprep" : "cg";
      if (s.sesion === "Reunión de Trabajo") result[org].reuniones++;
      else if (s.tipo === "Extraordinaria") result[org].extraordinarias++;
      else result[org].ordinarias++;
    }
    return result;
  }, []);

  const historicoXlsx = historicoMonthlyTable.map((r) => ({ Mes: r.month, "Año": r.year, Actividades: r.count }));
  const totalCepa = sessionSummary.cepaprep.extraordinarias + sessionSummary.cepaprep.ordinarias + sessionSummary.cepaprep.reuniones;
  const totalCg = sessionSummary.cg.extraordinarias + sessionSummary.cg.ordinarias + sessionSummary.cg.reuniones;

  return (
    <div className="space-y-6">
      {/* Resumen ejecutivo */}
      <div className="rounded-xl border border-info/20 bg-gradient-to-r from-info/5 to-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-info/15 text-info flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">Resumen del histórico (2023–2025)</h2>
            <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
              {histStats.total === 0
                ? "No hay actividades registradas en el periodo histórico."
                : <>En el periodo se registraron <span className="font-semibold">{histStats.total}</span> actividades, además de <span className="font-semibold text-primary">{totalCepa}</span> reuniones de CEPAPREP y <span className="font-semibold text-primary">{totalCg}</span> del Consejo General.</>}
            </p>
          </div>
        </div>
      </div>

      {/* Resumen de sesiones */}
      <div className="stat-card">
        <SectionHeader title="Resumen de sesiones" description="Sesiones y reuniones de trabajo realizadas por órgano." icon={<Users className="w-4 h-4" />}
          xlsxData={[
            { "Órgano": "CEPAPREP", "Sesiones Extraordinarias": sessionSummary.cepaprep.extraordinarias, "Sesiones Ordinarias": sessionSummary.cepaprep.ordinarias, "Reuniones de Trabajo": sessionSummary.cepaprep.reuniones },
            { "Órgano": "Consejo General", "Sesiones Extraordinarias": sessionSummary.cg.extraordinarias, "Sesiones Ordinarias": sessionSummary.cg.ordinarias, "Reuniones de Trabajo": sessionSummary.cg.reuniones },
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
              <div className="flex justify-between text-sm border-t border-border pt-2 mt-2"><span className="font-semibold text-foreground">Total</span><span className="font-bold text-primary">{totalCepa}</span></div>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border/50 bg-muted/10">
            <h3 className="text-sm font-bold text-foreground mb-3">Consejo General</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sesiones Extraordinarias</span><span className="font-bold text-foreground">{sessionSummary.cg.extraordinarias}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sesiones Ordinarias</span><span className="font-bold text-foreground">{sessionSummary.cg.ordinarias}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Reuniones de Trabajo</span><span className="font-bold text-foreground">{sessionSummary.cg.reuniones}</span></div>
              <div className="flex justify-between text-sm border-t border-border pt-2 mt-2"><span className="font-semibold text-foreground">Total</span><span className="font-bold text-primary">{totalCg}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Pie por año */}
      <div className="stat-card">
        <SectionHeader title="Actividades por año" description="Distribución de actividades históricas entre 2023, 2024 y 2025." icon={<PieIcon className="w-4 h-4" />} chartId="historico-pie-year" />
        <div id="historico-pie-year">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={histPieByYear} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} dataKey="value">
                {histPieByYear.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} actividades`, ""]} />
              <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Acumulado mensual */}
      <div className="stat-card">
        <SectionHeader title="Avance mes a mes (histórico)" description="Barras: actividades terminadas por mes. Línea verde: acumulado total." icon={<TrendingUp className="w-4 h-4" />} chartId="historico-cumulative-chart" />
        <div id="historico-cumulative-chart">
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={historicoMonthly} margin={{ top: 30, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220, 10%, 46%)" }} tickLine={false} axisLine={{ stroke: "hsl(220, 16%, 88%)" }} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 46%)" }} tickLine={false} axisLine={false} domain={[0, "auto"]} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 16%, 88%)", borderRadius: "8px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
              <Bar dataKey="actividades" name="Actividades del Mes" fill="hsl(200, 70%, 50%)" radius={[4, 4, 0, 0]} barSize={24}>
                <LabelList dataKey="actividades" position="top" fill="hsl(200, 70%, 40%)" fontSize={10} fontWeight={700} />
              </Bar>
              <Line dataKey="acumulado" name="Acumulado" stroke="hsl(152, 60%, 36%)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(152, 60%, 36%)", stroke: "white", strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla mensual */}
      <div className="stat-card">
        <SectionHeader title="Desglose mensual histórico" description="Cantidad de actividades terminadas por mes." icon={<Calendar className="w-4 h-4" />} xlsxData={historicoXlsx} xlsxFilename="historico_desglose_mensual" />
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

      {/* Barra mensual */}
      <div className="stat-card">
        <SectionHeader title="Carga histórica por mes" description="Visualización en barras de la actividad mensual del periodo histórico." icon={<BarChart3 className="w-4 h-4" />} chartId="historico-monthly-bar" />
        <div id="historico-monthly-bar">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={historicoMonthlyTable.map((r) => ({ name: `${r.month.substring(0, 3)} ${r.year}`, actividades: r.count }))} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220, 10%, 46%)" }} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 46%)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 16%, 88%)", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="actividades" name="Actividades" fill="hsl(200, 70%, 50%)" radius={[4, 4, 0, 0]} barSize={24}>
                <LabelList dataKey="actividades" position="top" fill="hsl(200, 70%, 40%)" fontSize={10} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
