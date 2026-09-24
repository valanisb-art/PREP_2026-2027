import { useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { subActivitiesMap } from "@/data/subActivities";

type ApplyTarget = "prep32" | "prep54";

interface ParsedResult {
  fileName: string;
  sheetName: string;
  headers: string[];
  previewRows: Record<string, unknown>[];
  allRows: Record<string, unknown>[];
  totalRows: number;
}

interface UpdateRow {
  clave: string; // código (32: "1.1.1") o número (54: "1")
  nombre?: string; // nombre del entregable (54)
  nivel: number | null;
  inicio: string;
  termino: string;
}

const MESES: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

// Convierte un valor de celda a "YYYY-MM-DD".
// Soporta: Date, "dd/mm/aa", "dd-mm-aaaa", "aaaa-mm-dd", "01-Aug-26" (mes en letras)
// y prefijos de día ("sáb 01/08/26").
function toISO(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  let s = String(v).trim();
  // Quitar prefijo de nombre de día ("sáb ", "mié "): todo lo no-dígito al inicio.
  s = s.replace(/^[^\d]*/, "").trim();
  // dd-MMM-aa / dd-MMM-aaaa (mes en letras): 01-Aug-26, 11-sep-2026
  const mn = s.match(/^(\d{1,2})[-/\s]+([A-Za-zñÑáéíóú.]+)[-/\s]+(\d{2,4})/);
  if (mn) {
    const mm = MESES[mn[2].slice(0, 3).toLowerCase()];
    if (mm) {
      let y = mn[3];
      if (y.length === 2) y = "20" + y;
      return `${y}-${String(mm).padStart(2, "0")}-${mn[1].padStart(2, "0")}`;
    }
  }
  // dd/mm/aa o dd/mm/aaaa (numérico)
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (dmy) {
    let y = dmy[3];
    if (y.length === 2) y = "20" + y;
    return `${y}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  // aaaa-mm-dd
  const ymd = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  return "";
}

// Nivel a partir del código (solo PREP-32): "1"->1, "1.1"->2, "1.1.1"->3
function nivelDe(code: string): number | null {
  const c = code.trim().replace(/\.0$/, "");
  if (/^\d+$/.test(c)) return 1;
  if (/^\d+\.\d+$/.test(c)) return 2;
  if (/^\d+\.\d+\.\d+$/.test(c)) return 3;
  return null;
}

function detectarColumna(headers: string[], patrones: RegExp[]): string | null {
  for (const p of patrones) {
    const found = headers.find((h) => p.test(h));
    if (found) return found;
  }
  return null;
}

function textoSubEstatica(parent: number, code: string): string | null {
  const subs = subActivitiesMap[parent] || [];
  const found = subs.find((s) => s.entregable === code);
  return found ? found.actividad : null;
}

function ExcelImporter({
  title,
  description,
  expectedName,
  accentClass,
  applyTarget,
}: {
  title: string;
  description: string;
  expectedName: string;
  accentClass: string;
  applyTarget: ApplyTarget;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const [updatePreview, setUpdatePreview] = useState<UpdateRow[] | null>(null);
  const [updateInfo, setUpdateInfo] = useState<string[]>([]);

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setWarnings([]);
    setSaved(false);
    setSavedName(null);
    setUpdatePreview(null);
    setUpdateInfo([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onSelect = (f: File | null) => {
    setResult(null);
    setError(null);
    setWarnings([]);
    setSaved(false);
    setSavedName(null);
    setUpdatePreview(null);
    setUpdateInfo([]);
    setFile(f);
  };

  const validar = async () => {
    if (!file) {
      toast.error("Primero elige un archivo Excel.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setWarnings([]);
    setSaved(false);
    setSavedName(null);
    setUpdatePreview(null);
    setUpdateInfo([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
      const headers = json.length ? Object.keys(json[0]) : [];

      const warns: string[] = [];
      if (!json.length) warns.push("El archivo no contiene filas de datos.");
      if (!file.name.toLowerCase().includes(expectedName.toLowerCase())) {
        warns.push(`El nombre del archivo no incluye "${expectedName}". Verifica que sea el archivo correcto.`);
      }

      setResult({
        fileName: file.name,
        sheetName,
        headers,
        previewRows: json.slice(0, 8),
        allRows: json,
        totalRows: json.length,
      });
      setWarnings(warns);
      toast.success(`Archivo leído: ${json.length} fila(s) detectada(s).`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError("No se pudo leer el archivo. Asegúrate de que sea un Excel válido (.xlsx). Detalle: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    if (!result || !file) {
      toast.error("Primero valida un archivo.");
      return;
    }
    setSaving(true);
    try {
      const API = (import.meta.env.VITE_LOCAL_API_URL as string) || "http://localhost:54321";
      const fd = new FormData();
      fd.append("key", expectedName);
      fd.append("file", file);
      const res = await fetch(`${API}/import/save`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setSaved(true);
      setSavedName(json.data.fileName);
      toast.success(`Archivo guardado en el servidor: ${json.data.fileName}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("No se pudo guardar el archivo: " + msg);
    } finally {
      setSaving(false);
    }
  };

  // Detección de columnas según el tipo de archivo.
  const columnas = (headers: string[]) => {
    const inicioCol = detectarColumna(headers, [/inicio/i, /fecha.*inicio/i]);
    const finCol = detectarColumna(headers, [/\bfin\b/i, /t[eé]rmino/i, /l[ií]mite/i]);
    if (applyTarget === "prep54") {
      const noCol = detectarColumna(headers, [/^no\.?$/i, /n[uú]mero/i, /^#$/]);
      const nombreCol = detectarColumna(headers, [/entregable/i, /descripci/i, /actividad/i]);
      return { keyCol: noCol, nombreCol, inicioCol, finCol };
    }
    // prep32: la clave es el código con puntos (columna "Nivel" o "Entregable")
    const keyCol = detectarColumna(headers, [/nivel/i, /entregable/i, /clave/i, /c[oó]digo/i]);
    return { keyCol, nombreCol: null as string | null, inicioCol, finCol };
  };

  const construirFilas = (): { rows: UpdateRow[]; info: string[]; ok: boolean } => {
    const { headers, allRows } = result!;
    const { keyCol, nombreCol, inicioCol, finCol } = columnas(headers);
    const info: string[] = [];

    if (applyTarget === "prep54") {
      info.push(`Columna No.: ${keyCol ?? "NO detectada"} · nombre: ${nombreCol ?? "—"} · inicio: ${inicioCol ?? "NO detectada"} · fin: ${finCol ?? "NO detectada"}`);
      if (!keyCol || (!inicioCol && !finCol)) {
        info.push("No pude detectar las columnas necesarias (No. / Inicio / Fin).");
        return { rows: [], info, ok: false };
      }
      const rows: UpdateRow[] = allRows.map((r) => ({
        clave: String(r[keyCol] ?? "").trim(),
        nombre: nombreCol ? String(r[nombreCol] ?? "").trim() : "",
        nivel: 1,
        inicio: inicioCol ? toISO(r[inicioCol]) : "",
        termino: finCol ? toISO(r[finCol]) : "",
      }));
      const validos = rows.filter((r) => /^\d+$/.test(r.clave)).length;
      info.push(`Entregables (nivel único) detectados: ${validos} de ${rows.length}`);
      return { rows, info, ok: true };
    }

    // prep32
    info.push(`Columna entregable: ${keyCol ?? "NO detectada"} · inicio: ${inicioCol ?? "NO detectada"} · fin: ${finCol ?? "NO detectada"}`);
    if (!keyCol || (!inicioCol && !finCol)) {
      info.push("No pude detectar las columnas necesarias. Dime cuál es entregable, inicio y fin.");
      return { rows: [], info, ok: false };
    }
    const rows: UpdateRow[] = allRows.map((r) => {
      const code = String(r[keyCol] ?? "").trim().replace(/\.0$/, "");
      return { clave: code, nivel: nivelDe(code), inicio: inicioCol ? toISO(r[inicioCol]) : "", termino: finCol ? toISO(r[finCol]) : "" };
    });
    const n1 = rows.filter((r) => r.nivel === 1).length;
    const n2 = rows.filter((r) => r.nivel === 2).length;
    const n3 = rows.filter((r) => r.nivel === 3).length;
    const sinNivel = rows.filter((r) => r.nivel === null).length;
    info.push(`Nivel 1: ${n1} · Nivel 2: ${n2} · Nivel 3: ${n3}${sinNivel ? ` · Sin clasificar: ${sinNivel}` : ""}`);
    return { rows, info, ok: true };
  };

  const guardarMarca = async (detalle: Record<string, unknown>) => {
    try {
      const API = (import.meta.env.VITE_LOCAL_API_URL as string) || "http://localhost:54321";
      await fetch(`${API}/import/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: expectedName, fileName: savedName, ...detalle }),
      });
    } catch {
      /* la marca es informativa */
    }
  };

  const actualizar = async () => {
    if (!result) { toast.error("Primero valida un archivo."); return; }
    if (!saved) { toast.error("Primero guarda el archivo."); return; }
    const { rows, info, ok } = construirFilas();
    setUpdatePreview(rows);
    setUpdateInfo(info);
    if (!ok) return;

    setUpdating(true);
    try {
      if (applyTarget === "prep54") {
        // Upsert de fechas por número de entregable en date_overrides_54
        const rows54 = rows
          .filter((r) => /^\d+$/.test(r.clave))
          .map((r) => ({ no: parseInt(r.clave, 10), inicio: r.inicio || null, fin: r.termino || null }));
        if (rows54.length) {
          const res = await supabase.from("date_overrides_54").upsert(rows54, { onConflict: "no" });
          if (res.error) throw new Error(res.error.message);
        }
        await guardarMarca({ entregables: rows54.length });
        toast.success(`Fechas de ${rows54.length} entregables actualizadas. Revisa PREP 26-27 → 54 entregables.`);
        return;
      }

      // prep32: 3 niveles
      const { data: existing } = await supabase
        .from("activity_text_overrides")
        .select("static_activity_id, sub_entregable, actividad");
      const textoOverride: Record<string, string> = {};
      (existing || []).forEach((o: { static_activity_id: number | null; sub_entregable: string | null; actividad: string | null }) => {
        if (o.static_activity_id != null && o.sub_entregable) {
          textoOverride[`${o.static_activity_id}::${o.sub_entregable}`] = String(o.actividad || "").split("|||DATES:")[0];
        }
      });
      const { keyCol } = columnas(result.headers);
      const actividadCol = detectarColumna(result.headers, [/actividad/i, /descripci/i]);
      const dateRows: Array<{ activity_id: number; inicio: string | null; termino: string | null }> = [];
      const subRows: Array<{ static_activity_id: number; sub_entregable: string; entregable: string; actividad: string }> = [];

      result.allRows.forEach((r) => {
        const code = String(r[keyCol!] ?? "").trim().replace(/\.0$/, "");
        const nivel = nivelDe(code);
        if (!code || !nivel) return;
        const mapped = rows.find((x) => x.clave === code);
        const inicio = mapped?.inicio || "";
        const fin = mapped?.termino || "";
        if (nivel === 1) {
          const activity_id = parseInt(code, 10);
          if (!isNaN(activity_id)) dateRows.push({ activity_id, inicio: inicio || null, termino: fin || null });
        } else {
          const parent = parseInt(code.split(".")[0], 10);
          if (isNaN(parent)) return;
          const key = `${parent}::${code}`;
          const excelText = actividadCol ? String(r[actividadCol] ?? "").split("|||DATES:")[0].trim() : "";
          const baseText = textoOverride[key] ?? textoSubEstatica(parent, code) ?? excelText ?? "";
          subRows.push({ static_activity_id: parent, sub_entregable: code, entregable: code, actividad: `${baseText}|||DATES:${inicio},${fin}` });
        }
      });

      let errores = 0;
      if (dateRows.length) {
        const res1 = await supabase.from("activity_date_overrides").upsert(dateRows, { onConflict: "activity_id" });
        if (res1.error) errores++;
      }
      if (subRows.length) {
        const res2 = await supabase.from("activity_text_overrides").upsert(subRows, { onConflict: "static_activity_id,sub_entregable" });
        if (res2.error) errores++;
      }
      if (errores > 0) {
        toast.error("Ocurrieron errores al escribir en la base.");
      } else {
        await guardarMarca({ nivel1: dateRows.length, nivel2y3: subRows.length });
        toast.success(`Fechas actualizadas: ${dateRows.length} de nivel 1 y ${subRows.length} de niveles 2/3. Revisa PREP 26-27 → 32 entregables.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("No se pudo actualizar: " + msg);
    } finally {
      setUpdating(false);
    }
  };

  const es54 = applyTarget === "prep54";

  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-1">
        <FileSpreadsheet className={`w-5 h-5 ${accentClass}`} />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer"
        />
        <Button size="sm" className="gap-1.5 text-xs" onClick={validar} disabled={loading}>
          <Upload className="w-3.5 h-3.5" />
          {loading ? "Leyendo..." : "2. Validar"}
        </Button>
        <Button size="sm" variant="secondary" className="gap-1.5 text-xs" onClick={guardar} disabled={!result || saved || saving}
          title={result ? "Guarda el archivo validado en el servidor" : "Primero valida un archivo"}>
          <Save className="w-3.5 h-3.5" />
          {saving ? "Guardando..." : saved ? "Guardado" : "3. Guardar"}
        </Button>
        <Button size="sm" variant="secondary" className="gap-1.5 text-xs" onClick={actualizar} disabled={!saved || updating}
          title={saved ? "Aplica las fechas del Excel" : "Primero guarda el archivo"}>
          <RefreshCw className="w-3.5 h-3.5" />
          {updating ? "Actualizando..." : "4. Actualizar"}
        </Button>
        {(result || error) && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={reset}>
            <X className="w-3.5 h-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border border-warning/30 bg-warning/10 text-xs text-foreground">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {savedName && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg border border-success/30 bg-success/10 text-sm text-success">
          <Save className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Guardado en el servidor: <strong>{savedName}</strong> · carpeta{" "}
            <code className="text-xs">local-server/storage/imports/</code>
          </span>
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Archivo válido: <strong>{result.fileName}</strong> · hoja "{result.sheetName}" ·{" "}
              <strong>{result.totalRows}</strong> fila(s) · <strong>{result.headers.length}</strong> columna(s)
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Columnas detectadas</p>
            <div className="flex flex-wrap gap-1.5">
              {result.headers.map((h) => (
                <span key={h} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/50">{h}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Vista previa (primeras {result.previewRows.length} filas)
            </p>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    {result.headers.map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-border/30">
                      {result.headers.map((h) => (
                        <td key={h} className="px-2 py-1.5 whitespace-nowrap max-w-[220px] truncate text-foreground/80">
                          {String(row[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {updatePreview && (
        <div className="mt-5 space-y-3 border-t border-border/50 pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <RefreshCw className="w-4 h-4 text-primary" />
            {es54 ? "Fechas aplicadas a los 54 entregables" : "Fechas mapeadas por nivel"}
          </div>
          <div className="space-y-1">
            {updateInfo.map((line, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {line}</p>
            ))}
          </div>

          {updatePreview.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border/50 max-h-80 overflow-y-auto">
              <table className="min-w-full text-[11px]">
                <thead className="sticky top-0">
                  <tr className="bg-muted/50 text-muted-foreground">
                    {es54 ? (
                      <>
                        <th className="px-2 py-1.5 text-left font-semibold">No.</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Entregable</th>
                      </>
                    ) : (
                      <>
                        <th className="px-2 py-1.5 text-left font-semibold">Entregable</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Nivel</th>
                      </>
                    )}
                    <th className="px-2 py-1.5 text-left font-semibold">Inicio</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {updatePreview.map((r, i) => (
                    <tr key={i} className="border-t border-border/30">
                      {es54 ? (
                        <>
                          <td className="px-2 py-1.5 font-mono">{r.clave || "—"}</td>
                          <td className="px-2 py-1.5 truncate max-w-[240px]">{r.nombre || "—"}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 font-mono">{r.clave || "—"}</td>
                          <td className="px-2 py-1.5">
                            {r.nivel ? (
                              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">Nivel {r.nivel}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-2 py-1.5">{r.inicio || "—"}</td>
                      <td className="px-2 py-1.5 text-info">{r.termino || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ImportarPage() {
  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary" />
            Importar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Flujo en 4 pasos: <strong>1. Importar</strong> (elegir archivo) → <strong>2. Validar</strong> (revisar
            contenido) → <strong>3. Guardar</strong> (almacenar) → <strong>4. Actualizar</strong> (aplicar las fechas).
          </p>
        </div>

        <ExcelImporter
          title="Importar 32 entregables (PREP 26-27)"
          description="Selecciona el archivo Excel de los 32 entregables (con 3 niveles: 1, 1.1, 1.1.1), por ejemplo PREP-32.xlsx."
          expectedName="PREP-32"
          accentClass="text-primary"
          applyTarget="prep32"
        />

        <ExcelImporter
          title="Importar 54 entregables (PREP 26-27)"
          description="Selecciona el archivo Excel de los 54 entregables (nivel único, identificados por No. 1–54), por ejemplo PREP-54.xlsx."
          expectedName="PREP-54"
          accentClass="text-info"
          applyTarget="prep54"
        />
      </div>
    </AppLayout>
  );
}
