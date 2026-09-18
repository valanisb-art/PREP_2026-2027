import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Loader2, ExternalLink, Paperclip } from "lucide-react";
import { openEvidencia, extractEvidenciaPath } from "@/lib/evidenciaUrl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EvidenceFile {
  id: string;
  file_name: string;
  file_url: string;
}

interface Props {
  activityId: number;
  subActivityEntregable: string;
}

export default function SubActivityEvidenceUploader({ activityId, subActivityEntregable }: Props) {
  const { user, isAdmin, isInvitado } = useAuth();
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("activity_evidence")
      .select("id, file_name, file_url")
      .eq("activity_id", activityId)
      .eq("section", "prep")
      .eq("sub_activity_entregable", subActivityEntregable)
      .order("created_at", { ascending: false });
    if (data) setFiles(data);
  };

  useEffect(() => {
    if (expanded) fetchFiles();
  }, [expanded, activityId, subActivityEntregable]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = `prep/actividad-${activityId}/sub-${subActivityEntregable}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("evidencias").upload(path, file);
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("activity_evidence").insert({
        activity_id: activityId,
        file_name: file.name,
        file_url: path,
        uploaded_by: user.id,
        section: "prep",
        sub_activity_entregable: subActivityEntregable,
      } as any);
      if (insertError) throw insertError;
      toast.success("Evidencia subida");
      fetchFiles();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string, fileUrl: string) => {
    try {
      const path = extractEvidenciaPath(fileUrl);
      if (path) await supabase.storage.from("evidencias").remove([path]);
      await supabase.from("activity_evidence").delete().eq("id", fileId);
      toast.success("Evidencia eliminada");
      fetchFiles();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  return (
    <div className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <Popover open={expanded} onOpenChange={setExpanded}>
        <PopoverTrigger asChild>
          <button
            className="text-muted-foreground hover:text-primary p-0.5 rounded transition-colors"
            title="Evidencias"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {files.length > 0 && <span className="text-[9px] ml-0.5 font-bold text-primary">{files.length}</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-3 shadow-lg z-[9999]" align="start" side="right" onClick={e => e.stopPropagation()}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Evidencias – {subActivityEntregable}</p>

          {!isInvitado && (
            <>
              <input ref={inputRef} type="file" onChange={handleUpload} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip" />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline mb-2"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploading ? "Subiendo..." : "Subir archivo"}
              </button>
            </>
          )}

          {files.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">Sin evidencias.</p>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-1.5 text-xs">
                  <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                  <button
                    type="button"
                    onClick={() => openEvidencia(f.file_url)}
                    className="truncate text-left text-foreground hover:text-primary flex-1"
                  >
                    {f.file_name}
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(f.id, f.file_url)} className="text-destructive hover:text-destructive/80 p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
