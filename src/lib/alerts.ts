// ============================================================================
// Lógica pura (sin dependencias de React/Supabase) para:
//  - computeEntregableProgress: avance por hojas (subtareas de último nivel marcadas)
//  - buildAlerts: alertas del Dashboard, excluyendo lo ya marcado / completado
// Se aísla aquí para poder probarla con pruebas unitarias.
// ============================================================================

export interface AlertSub {
  entregable: string;
  actividad?: string;
  inicio?: string;
  termino?: string;
  checked?: boolean;
}

export interface AlertActivity {
  id: string | number;
  entregable: string;
  actividad: string;
  inicio?: string;
  termino?: string;
  status: string;
  areaResponsable?: string;
  subActivities: AlertSub[];
}

export interface PrepAlert {
  type: "danger" | "warning";
  message: string;
  activity: Record<string, unknown>;
  daysInfo: number;
}

// Avance por hojas (opción B): % de subactividades de último nivel marcadas.
// Una "hoja" es una subactividad que no tiene otra cuyo código empiece con "<código>.".
// Devuelve null si el entregable no tiene subactividades.
export function computeEntregableProgress(subs: { entregable: string; checked?: boolean }[]): number | null {
  if (!subs || subs.length === 0) return null;
  const leaves = subs.filter(
    (s) => !subs.some((o) => o.entregable !== s.entregable && o.entregable.startsWith(s.entregable + ".")),
  );
  if (leaves.length === 0) return null;
  const done = leaves.filter((s) => s.checked).length;
  return Math.round((done / leaves.length) * 100);
}

const MS_DAY = 1000 * 60 * 60 * 24;

// Genera las alertas del Dashboard.
// Reglas: se ignoran las subtareas marcadas (checked) y los entregables completos
// (100% de hojas marcadas o status "Entregado"). Vencida (danger) si la fecha
// término ya pasó; "vence pronto" (warning) si faltan 0-7 días.
export function buildAlerts(activities: AlertActivity[], today: Date = new Date()): PrepAlert[] {
  const t0 = new Date(today);
  t0.setHours(0, 0, 0, 0);
  const list: PrepAlert[] = [];

  activities.forEach((act) => {
    const pct = computeEntregableProgress(act.subActivities);
    const actDone = pct === 100 || act.status === "Entregado";
    if (actDone) return;

    if (act.termino) {
      const diff = Math.ceil((new Date(act.termino + "T00:00:00").getTime() - t0.getTime()) / MS_DAY);
      if (diff < 0) list.push({ type: "danger", message: "Actividad atrasada", activity: act, daysInfo: Math.abs(diff) });
      else if (diff <= 7) list.push({ type: "warning", message: "Actividad vence pronto", activity: act, daysInfo: diff });
    }

    act.subActivities.forEach((sub) => {
      if (sub.checked) return; // subtareas marcadas no generan alerta
      if (!sub.termino) return;
      const diff = Math.ceil((new Date(sub.termino + "T00:00:00").getTime() - t0.getTime()) / MS_DAY);
      const activity = { ...sub, areaResponsable: act.areaResponsable, id: act.id };
      if (diff < 0) list.push({ type: "danger", message: "Subtarea atrasada", activity, daysInfo: Math.abs(diff) });
      else if (diff <= 7 && diff >= 0) list.push({ type: "warning", message: "Subtarea vence pronto", activity, daysInfo: diff });
    });
  });

  return list.sort((a, b) => (a.type === "danger" ? -1 : 1));
}
