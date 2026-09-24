import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Entregable54Gantt {
  no: number;
  entregable: string;
  descripcion: string;
  tema: string;
  responsable: string;
  inicio: string;
  fin: string;
  actividadesRelacionadas: string;
  relacionesDirectas: number;
  relacionesIndirectas: number;
  estatusRelacion: string;
  observaciones: string;
  status: string;
}

export function usePrep54() {
  const [data, setData] = useState<Entregable54Gantt[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateStatus = (inicio: string, fin: string) => {
    const finDate = new Date(fin + "T00:00:00");
    const finYear = finDate.getFullYear();
    const finMonth = finDate.getMonth();
    
    const today = new Date();
    const currYear = today.getFullYear();
    const currMonth = today.getMonth();
    
    const absFinMonth = finYear * 12 + finMonth;
    const absCurrMonth = currYear * 12 + currMonth;
    
    if (absFinMonth <= absCurrMonth) {
      return 'Entregado';
    } else if (absFinMonth === absCurrMonth + 1) {
      return 'Por entregar';
    } else {
      const inicioDate = new Date(inicio + "T00:00:00");
      if (inicioDate <= today) {
        return 'En Proceso';
      }
    }
    return 'Pendiente';
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: results, error } = await supabase.from("entregables_54").select("*").order("no", { ascending: true });
    
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (results) {
      const formatted = results.map(row => ({
        no: row.no,
        entregable: row.entregable,
        descripcion: row.descripcion,
        tema: row.tema,
        responsable: row.responsable,
        inicio: row.inicio,
        fin: row.fin,
        actividadesRelacionadas: row.actividades_relacionadas,
        relacionesDirectas: row.relaciones_directas,
        relacionesIndirectas: row.relaciones_indirectas,
        estatusRelacion: row.estatus_relacion,
        observaciones: row.observaciones,
        // Status es 100% automático para los 54 entregables
        status: calculateStatus(row.inicio, row.fin)
      }));
      setData(formatted);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes-54')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregables_54' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
