import { useNavigate } from "react-router-dom";
import { Activity } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

interface Props {
  activities: Activity[];
}

export default function ActivityTable({ activities }: Props) {
  const navigate = useNavigate();

  const statusClass = (s: string) => {
    if (s === 'Pendiente') return 'status-pendiente';
    if (s === 'En Proceso') return 'status-en-proceso';
    return 'status-entregado';
  };

  return (
    <div className="bg-card rounded-lg shadow-card border border-border/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">#</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actividad</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Área</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Inicio</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Término</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {activities.map((act) => (
            <tr
              key={act.id}
              onClick={() => navigate(`/actividad/${act.id}`)}
              className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{act.entregable}</td>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground line-clamp-2 max-w-md">{act.actividad}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{act.areaResponsable}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(act.proyeccion.inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(act.proyeccion.termino).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                <span className={`status-badge ${statusClass(act.status)}`}>{act.status}</span>
              </td>
              <td className="px-4 py-3">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
