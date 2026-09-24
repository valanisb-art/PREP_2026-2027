import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Loader2, ExternalLink } from "lucide-react";
import { openEvidencia, extractEvidenciaPath } from "@/lib/evidenciaUrl";

interface EvidenceFile {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

interface EvidenceUploaderProps {
  activityId: number;
  section?: "prep" | "historico";
}

export default function EvidenceUploader({ activityId, section = "prep" }: EvidenceUploaderProps) {
  const { user, isAdmin, isInvitado } = useAuth();
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from("activity_evidence")
      .select("*")
      .eq("activity_id", activityId)
      .eq("section", section)
      .order("created_at", { ascending: false });

    if (!error && data) setFiles(data as EvidenceFile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, [activityId, section]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const path = `${section}/actividad-${activityId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("evidencias")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("activity_evidence")
        .insert({
          activity_id: activityId,
          file_name: file.name,
          file_url: path,
          uploaded_by: user.id,
          section,
        });

      if (insertError) throw insertError;

      toast.success("Evidencia subida correctamente");
      fetchFiles();
    } catch (err: any) {
      toast.error("Error al subir archivo: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string, fileUrl: string) => {
    try {
      const path = extractEvidenciaPath(fileUrl);
      if (path) {
        await supabase.storage.from("evidencias").remove([path]);
      }
      await supabase.from("activity_evidence").delete().eq("id", fileId);
      toast.success("Evidencia eliminada");
      fetchFiles();
    } catch (err: any) {
      toast.error("Error al eliminar: " + err.message);
    }
  };

  return (
    <div className="stat-card">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5" /> Evidencia Documental
      </h3>

      {!isInvitado && (
        <div className="mb-4">
          <input
            ref={inputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full border-dashed"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {uploading ? "Subiendo..." : "Subir evidencia"}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando archivos...</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin evidencias registradas.</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground truncate">{f.file_name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEvidencia(f.file_url)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Abrir evidencia"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(f.id, f.file_url)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
