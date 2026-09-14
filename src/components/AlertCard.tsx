import { AlertTriangle, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  type: 'proxima' | 'activa' | 'vencida' | 'critica';
  activityName: string;
  entregable: string;
  daysInfo: number;
  onClick?: () => void;
  inicio?: string;
  termino?: string;
}

const config = {
  proxima: { icon: Clock, label: "Próxima a iniciar", className: "status-pendiente" },
  activa: { icon: AlertCircle, label: "En curso", className: "status-en-proceso" },
  vencida: { icon: AlertTriangle, label: "Vencida", className: "status-critico" },
  critica: { icon: AlertTriangle, label: "Próxima a vencer", className: "status-pendiente" },
};

const formatDate = (d?: string) => {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AlertCard({ type, activityName, entregable, daysInfo, onClick, inicio, termino }: Props) {
  const { icon: Icon, label, className } = config[type];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left alert-row animate-slide-in ${type === 'vencida' ? 'animate-pulse-alert' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        type === 'vencida' ? 'bg-destructive/20' : type === 'critica' ? 'bg-warning/20' : type === 'proxima' ? 'bg-amber-500/20' : 'bg-info/20'
      }`}>
        <Icon className={`w-4 h-4 ${
          type === 'vencida' ? 'text-destructive' : type === 'critica' ? 'text-warning' : type === 'proxima' ? 'text-amber-500' : 'text-info'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {entregable} — {activityName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`status-badge ${className}`}>{label}</span>
          <span className="text-xs text-muted-foreground">
            {type === 'vencida' ? `${daysInfo} días de retraso` :
             type === 'proxima' ? `Inicia en ${daysInfo} días` :
             `${daysInfo} días restantes`}
          </span>
        </div>
        {(inicio || termino) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
            {inicio && <span><span className="font-medium">Inicio:</span> {formatDate(inicio)}</span>}
            {termino && <span><span className="font-medium">Fecha límite:</span> {formatDate(termino)}</span>}
          </div>
        )}
      </div>
    </button>
  );
}
