export type ActivityStatus = 'Pendiente' | 'En Proceso' | 'Entregado';

export interface SubActivity {
  level: number; // 2 or 3
  entregable: string; // e.g. "1.1", "1.1.1"
  actividad: string;
  documento: string;
  inicio?: string;
  remisionINE2?: string;
}

export interface Activity {
  id: number;
  entregable: string;
  actividad: string;
  documento: string;
  fundamento: string;
  organoAprueba: string;
  historico: {
    inicio: string;
    termino: string;
    dias: number;
  };
  proyeccion: {
    inicio: string;
    termino: string;
    dias: number;
  };
  remisionINE?: string;
  remisionINE2?: string;
  situacionCritica: string;
  areaResponsable: string;
  areasInvolucradas: string[];
  etiquetas: string[];
  status: ActivityStatus;
  areaInterna: string;
  personalArea: string;
  subActivities?: SubActivity[];
}

export interface DailyAlert {
  activityId: number;
  type: 'vencimiento' | 'inicio' | 'critico';
  message: string;
  daysRemaining: number;
}
