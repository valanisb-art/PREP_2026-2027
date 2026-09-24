import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import AlertCard from "@/components/AlertCard";
import { JORNADA_ELECTORAL } from "@/data/activities";
import { FileText, Clock, PlayCircle, CheckCircle2, AlertTriangle, CalendarDays, Search, Users, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { usePrepActivitiesWithSubs, computeEntregableProgress } from "@/hooks/usePrepActivitiesWithSubs";
import { buildAlerts } from "@/lib/alerts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function getTimeRemaining(targetDate: Date) {
  const now = new Date();
  let years = targetDate.getFullYear() - now.getFullYear();
  let months = targetDate.getMonth() - now.getMonth();
  let days = targetDate.getDate() - now.getDate();
  if (days < 0) { months--; days += new Date(targetDate.getFullYear(), targetDate.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  const totalDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { years, months, days, totalDays };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState("");
  const { activities: unifiedActivities } = usePrepActivitiesWithSubs();
  const { role } = useAuth();
  const [pendingUsers, setPendingUsers] = useState(0);

  useEffect(() => {
    if (role === 'admin') {
      const fetchPending = async () => {
        const { data: profiles } = await supabase.from("profiles").select("id, email");
        const { data: roles } = await supabase.from("user_roles").select("user_id, role");
        
        if (profiles && roles) {
          const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
          const validUsers = profiles.filter(p => p.email);
          let count = 0;
          validUsers.forEach(p => {
            const r = roleMap.get(p.id) || "invitado";
            if (r === "invitado") count++;
          });
          setPendingUsers(count);
        }
      };
      fetchPending();
    }
  }, [role]);

  const computedStats = useMemo(() => {
    let total = 0, pendiente = 0, enProceso = 0, entregado = 0;
    unifiedActivities.forEach(a => {
      total++;
      const pct = computeEntregableProgress(a.subActivities);
      const eff = pct === 100 ? 'Entregado' : a.status;
      if (eff === 'Pendiente') pendiente++;
      else if (eff === 'En Proceso') enProceso++;
      else if (eff === 'Entregado') entregado++;
    });
    return { total, pendiente, enProceso, entregado };
  }, [unifiedActivities]);

  const alerts = useMemo(() => buildAlerts(unifiedActivities as never), [unifiedActivities]);

  const progress = computedStats.total > 0 ? Math.round((computedStats.entregado / computedStats.total) * 100) : 0;
  
  const [jy, jm, jd] = JORNADA_ELECTORAL.split('-').map(Number);
  const jornadaDate = new Date(jy, jm - 1, jd);
  const today = new Date();
  const remaining = getTimeRemaining(jornadaDate);

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
        {pendingUsers > 0 && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive-foreground animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Nuevos registros pendientes</h3>
                <p className="text-sm opacity-90">Tienes {pendingUsers} usuario{pendingUsers > 1 ? 's' : ''} esperando que le asignes un rol.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium"
            >
              Ir a Administración <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard PREP 2027</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {today.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Sistema de seguimiento · Proceso Electoral 2026-2027
            </p>
          </div>
          <div className="stat-card flex items-center gap-4 !p-4">
            <CalendarDays className="w-6 h-6 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Jornada Electoral</p>
              <p className="text-sm font-bold text-foreground">
                {jornadaDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {remaining.years > 0 && `${remaining.years} año${remaining.years > 1 ? 's' : ''}, `}{remaining.months} mes{remaining.months !== 1 ? 'es' : ''}, {remaining.days} día{remaining.days !== 1 ? 's' : ''}
                </span>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {remaining.totalDays} días restantes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar actividades, áreas..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="pl-9" />
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((act) => (
                <button key={act.id} onClick={() => { navigate(`/actividad/${act.id}`); setGlobalSearch(""); }} className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary font-bold">{act.entregable}</span>
                    <span className="text-sm text-foreground line-clamp-1">{act.actividad}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{act.areaResponsable}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Actividades" value={computedStats.total} icon={<FileText className="w-5 h-5" />} color="primary" />
          <StatCard title="Pendientes" value={computedStats.pendiente} subtitle={`${Math.round((computedStats.pendiente / (computedStats.total || 1)) * 100)}% del total`} icon={<Clock className="w-5 h-5" />} color="warning" />
          <StatCard title="En Proceso" value={computedStats.enProceso} icon={<PlayCircle className="w-5 h-5" />} color="info" />
          <StatCard title="Entregados" value={computedStats.entregado} icon={<CheckCircle2 className="w-5 h-5" />} color="success" />
        </div>

        {/* Progress */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">Avance General</p>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-2">{computedStats.entregado} de {computedStats.total} entregables completados</p>
        </div>

        <div className="space-y-3 mt-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Alertas</h2>
            {alerts.length > 0 && (
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">{alerts.length}</span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="stat-card text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sin alertas activas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1 pb-4">
              {alerts.slice(0, 30).map((alert, i) => (
                <AlertCard
                  key={i}
                  type={alert.type === 'danger' ? 'vencida' : 'critica'}
                  activityName={`${alert.message}: ${alert.activity.actividad || ''}`}
                  entregable={alert.activity.entregable}
                  daysInfo={alert.daysInfo}
                  inicio={alert.activity.inicio}
                  termino={alert.activity.termino}
                  onClick={() => navigate(`/actividad/${alert.activity.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
