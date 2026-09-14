import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { activities } from "@/data/activities";
import { ActivityStatus } from "@/data/types";
import { supabase } from "@/integrations/supabase/client";
import StatusChanger from "@/components/actividad/StatusChanger";
import EvidenceUploader from "@/components/actividad/EvidenceUploader";
import { ArrowLeft, Calendar, Users, AlertTriangle, FileText, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { openEvidencia } from "@/lib/evidenciaUrl";

export default function ActividadDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activity = activities.find(a => a.id === Number(id));
  const [dbStatus, setDbStatus] = useState<ActivityStatus | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<{ file_name: string; file_url: string }[]>([]);

  const isHistorico = searchParams.get("from") === "historico";

  const section = isHistorico ? "historico" : "prep";

  useEffect(() => {
    if (!activity) return;
    supabase
      .from("activity_status")
      .select("status")
      .eq("activity_id", activity.id)
      .eq("section", section)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDbStatus(data.status as ActivityStatus);
      });
  }, [activity?.id, section]);

  // Fetch evidence files for PREP view
  useEffect(() => {
    if (!activity || isHistorico) return;
    supabase
      .from("activity_evidence")
      .select("file_name, file_url")
      .eq("activity_id", activity.id)
      .eq("section", "prep")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setEvidenceFiles(data);
      });
  }, [activity?.id, isHistorico]);

  if (!activity) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Actividad no encontrada</p>
          <button onClick={() => navigate('/')} className="text-primary text-sm mt-2 hover:underline">Volver al dashboard</button>
        </div>
      </AppLayout>
    );
  }

  const effectiveStatus = dbStatus ?? activity.status;
  const statusClass = effectiveStatus === 'Pendiente' ? 'status-pendiente' : effectiveStatus === 'En Proceso' ? 'status-en-proceso' : 'status-entregado';


  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Regresar
        </button>

        {/* Header */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">Entregable {activity.entregable}</span>
                <span className={`status-badge ${statusClass}`}>{effectiveStatus}</span>
              </div>
              <h1 className="text-xl font-bold text-foreground leading-tight">{activity.actividad}</h1>
            </div>
          </div>

          {/* Status changer - available for both sections */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cambiar Estatus</p>
            <StatusChanger
              activityId={activity.id}
              currentStatus={activity.status}
              dbStatus={dbStatus}
              onStatusChange={(s) => setDbStatus(s)}
              section={section}
            />
          </div>
        </div>

        {/* Proyección / Histórico dates */}
        <div className="stat-card border-primary/30">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> {isHistorico ? "Histórico (2024-2025)" : "Proyección (2026-2027)"}
          </h3>
          <div className="space-y-2">
            {/* For PREP: show evidence documents dynamically */}
            {!isHistorico && evidenceFiles.length > 0 && (
              <>
                <div className="text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5 mb-1"><FileText className="w-3.5 h-3.5" /> Documentos</span>
                  <div className="space-y-1 ml-5">
                    {evidenceFiles.map((f, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openEvidencia(f.file_url)}
                        className="block text-xs text-primary hover:underline truncate text-left w-full"
                      >
                        {f.file_name}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}
            {/* For Histórico: show static documento */}
            {isHistorico && activity.documento && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Documento</span>
                  <span className="font-medium text-foreground">{activity.documento}</span>
                </div>
                <Separator />
              </>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Inicio</span>
              <span className="font-medium text-foreground">
                {new Date(isHistorico ? activity.historico.inicio : activity.proyeccion.inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Término</span>
              <span className="font-medium text-foreground">
                {new Date(isHistorico ? activity.historico.termino : activity.proyeccion.termino).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duración</span>
              <span className="font-bold text-foreground">{isHistorico ? activity.historico.dias : activity.proyeccion.dias} días</span>
            </div>
          </div>
        </div>

        {/* Critical situation */}
        {activity.situacionCritica && (
          <div className="alert-row">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Situación Crítica</p>
              <p className="text-sm text-foreground mt-0.5">{activity.situacionCritica}</p>
            </div>
          </div>
        )}

        {/* Evidence upload - separate per section */}
        <EvidenceUploader activityId={activity.id} section={isHistorico ? "historico" : "prep"} />

        {/* Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-card">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building className="w-3.5 h-3.5" /> Área Responsable
            </h3>
            <p className="text-sm font-bold text-foreground">{activity.areaResponsable}</p>
            {activity.areaInterna && <p className="text-xs text-muted-foreground mt-1">{activity.areaInterna}</p>}
            {activity.personalArea && <p className="text-xs text-muted-foreground">{activity.personalArea}</p>}
          </div>
          <div className="stat-card">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Áreas Involucradas
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {activity.areasInvolucradas.map((area) => (
                <Badge key={area} variant="secondary" className="text-xs">{area}</Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        {activity.etiquetas.length > 0 && (
          <div className="stat-card">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Etiquetas</h3>
            <div className="flex flex-wrap gap-1.5">
              {activity.etiquetas.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {activity.organoAprueba && activity.organoAprueba !== "N/A" && (
          <div className="stat-card">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Órgano que Aprueba</h3>
            <p className="text-sm font-medium text-foreground">{activity.organoAprueba}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
