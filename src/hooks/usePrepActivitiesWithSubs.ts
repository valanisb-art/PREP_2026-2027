import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { activities } from "@/data/activities";
import { subActivitiesMap } from "@/data/subActivities";
import { ActivityStatus, SubActivity } from "@/data/types";

export interface UnifiedActivity {
  id: string | number;
  staticId?: number;
  customId?: string;
  isCustom: boolean;
  entregable: string;
  actividad: string;
  inicio: string;
  termino: string;
  remisionINE?: string;
  remisionINE2?: string;
  status: ActivityStatus;
  areaResponsable: string;
  subActivities: UnifiedSubActivity[];
  key: string;
}

export interface UnifiedSubActivity {
  id: string | number;
  staticId?: string; // sub.entregable para estaticas
  customId?: string; // id de supabase para custom
  isCustom: boolean;
  level: number;
  entregable: string;
  actividad: string;
  inicio?: string;
  termino?: string; // mapeado desde remisionINE2
  status: ActivityStatus;
  avance: number;
}

export function usePrepActivitiesWithSubs() {
  const [data, setData] = useState<UnifiedActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Extract date parser
  const parseDates = (rawAct?: string) => {
    let text = rawAct || "";
    let inicio, termino;
    if (text.includes("|||DATES:")) {
      const parts = text.split("|||DATES:");
      text = parts[0];
      const dates = parts[1].split(",");
      inicio = dates[0] || undefined;
      termino = dates[1] || undefined;
    }
    return { text, inicio, termino };
  };

  const calculateProgress = (inicio?: string | null, termino?: string | null, status?: string) => {
    if (status === 'Entregado') return 100;
    if (!inicio || !termino) return 0;
    const today = new Date().getTime();
    const start = new Date(inicio).getTime();
    const end = new Date(termino).getTime();
    if (today < start) return 0;
    if (today > end) return 100;
    if (end === start) return 100;
    return Math.round(((today - start) / (end - start)) * 100);
  };

  const calculateStatus = (inicio?: string | null, termino?: string | null): ActivityStatus => {
    if (!inicio || !termino) return 'Pendiente';
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(inicio + "T00:00:00");
    const end = new Date(termino + "T00:00:00");
    if (today > end) return 'Atrasado' as any; // Using custom status for visual, but it's not strictly in ActivityStatus type, let's map atrasado to En Proceso for colors or keep En Proceso.
    // Actually, dashboard uses specific colors for status. Let's return standard statuses.
    if (today.getTime() > end.getTime()) return 'En Proceso'; // Subtasks don't have real status yet. Let's just say En Proceso if active/overdue.
    if (today >= start) return 'En Proceso';
    return 'Pendiente';
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [
      { data: prepStatuses },
      { data: customActs },
      { data: customSubs },
      { data: deletedActs },
      { data: textOverrides },
      { data: dateOverrides },
      { data: hiddenSubs }
    ] = await Promise.all([
      supabase.from("activity_status").select("activity_id, status").eq("section", "prep"),
      supabase.from("custom_activities").select("id, entregable, actividad, inicio, termino, status, area_responsable"),
      supabase.from("custom_sub_activities").select("id, parent_activity_id, parent_static_activity_id, level, entregable, actividad"),
      supabase.from("deleted_activities").select("activity_id"),
      supabase.from("activity_text_overrides").select("static_activity_id, sub_entregable, entregable, actividad"),
      supabase.from("activity_date_overrides").select("activity_id, termino, inicio"),
      supabase.from("hidden_static_subs").select("static_activity_id, sub_entregable"),
    ]);

    const deletedSet = new Set((deletedActs || []).map(d => d.activity_id));
    const hiddenSubSet = new Set((hiddenSubs || []).map(h => `${h.static_activity_id}::${h.sub_entregable}`));
    
    const statusMap: Record<number, ActivityStatus> = {};
    (prepStatuses || []).forEach(s => statusMap[s.activity_id] = s.status as ActivityStatus);

    const dateOvMap: Record<number, any> = {};
    (dateOverrides || []).forEach(d => dateOvMap[d.activity_id] = d);

    // Build Static Activities
    const prepStatic = activities.filter(a => {
      const year = new Date(a.proyeccion.inicio).getFullYear();
      return (year >= 2026 && year <= 2027) && !deletedSet.has(a.id);
    }).map(a => {
      const dov = dateOvMap[a.id];
      const actNumber = parseInt(a.entregable.replace('.0', ''));
      const staticSubData = subActivitiesMap[actNumber] || [];
      
      const mappedSubs: UnifiedSubActivity[] = [];
      
      // Add static subs
      staticSubData.forEach(sub => {
        if (hiddenSubSet.has(`${a.id}::${sub.entregable}`)) return;
        const ov = (textOverrides || []).find(o => o.static_activity_id === a.id && o.sub_entregable === sub.entregable);
        
        const { text, inicio: parsedInicio, termino: parsedTermino } = parseDates(ov?.actividad ?? sub.actividad);
        const finalInicio = parsedInicio !== undefined ? parsedInicio : sub.inicio;
        const finalTermino = parsedTermino !== undefined ? parsedTermino : sub.remisionINE2;

        mappedSubs.push({
          id: `${a.id}-${sub.entregable}`,
          staticId: sub.entregable,
          isCustom: false,
          level: sub.level,
          entregable: ov?.entregable ?? sub.entregable,
          actividad: text,
          inicio: finalInicio,
          termino: finalTermino,
          status: calculateStatus(finalInicio, finalTermino),
          avance: calculateProgress(finalInicio, finalTermino, 'Pendiente')
        });
      });

      // Add custom subs for this static activity
      (customSubs || []).filter(cs => cs.parent_static_activity_id === a.id).forEach(cs => {
        const { text, inicio, termino } = parseDates(cs.actividad);
        mappedSubs.push({
          id: cs.id,
          customId: cs.id,
          isCustom: true,
          level: cs.level,
          entregable: cs.entregable,
          actividad: text,
          inicio,
          termino,
          status: calculateStatus(inicio, termino),
          avance: calculateProgress(inicio, termino, 'Pendiente')
        });
      });

      // Sort subs by entregable numerically
      mappedSubs.sort((x, y) => x.entregable.localeCompare(y.entregable, undefined, { numeric: true }));

      return {
        id: a.id,
        staticId: a.id,
        isCustom: false,
        key: `static-${a.id}`,
        entregable: a.entregable,
        actividad: a.actividad,
        inicio: dov?.inicio || a.proyeccion.inicio,
        termino: dov?.termino || a.proyeccion.termino,
        remisionINE: a.remisionINE,
        remisionINE2: a.remisionINE2,
        status: statusMap[a.id] || a.status,
        areaResponsable: a.areaResponsable,
        subActivities: mappedSubs
      } as UnifiedActivity;
    });

    // Build Custom Activities
    const prepCustom = (customActs || []).map(ca => {
      const mappedSubs: UnifiedSubActivity[] = [];
      
      // Add custom subs for this custom activity
      (customSubs || []).filter(cs => cs.parent_activity_id === ca.id).forEach(cs => {
        const { text, inicio, termino } = parseDates(cs.actividad);
        mappedSubs.push({
          id: cs.id,
          customId: cs.id,
          isCustom: true,
          level: cs.level,
          entregable: cs.entregable,
          actividad: text,
          inicio,
          termino,
          status: calculateStatus(inicio, termino),
          avance: calculateProgress(inicio, termino, 'Pendiente')
        });
      });

      mappedSubs.sort((x, y) => x.entregable.localeCompare(y.entregable, undefined, { numeric: true }));

      return {
        id: ca.id,
        customId: ca.id,
        isCustom: true,
        key: `custom-${ca.id}`,
        entregable: ca.entregable,
        actividad: ca.actividad,
        inicio: ca.inicio,
        termino: ca.termino,
        status: ca.status as ActivityStatus,
        areaResponsable: ca.area_responsable || '',
        subActivities: mappedSubs
      } as UnifiedActivity;
    });

    const unified = [...prepStatic, ...prepCustom].sort((a, b) => a.entregable.localeCompare(b.entregable, undefined, { numeric: true }));
    setData(unified);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { activities: data, loading, refetch: fetchData };
}
