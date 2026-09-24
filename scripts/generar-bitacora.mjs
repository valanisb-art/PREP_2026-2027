// ============================================================================
// Genera una bitácora sencilla en Excel de los cambios realizados en el
// Dashboard PREP, a partir de que el proyecto ya se visualizaba en local.
//
// Uso (desde la carpeta Dashboard_Final):
//   node scripts/generar-bitacora.mjs
//
// Para agregar un cambio nuevo: añade una fila al arreglo "cambios" y vuelve
// a ejecutar el script. El archivo Bitacora-cambios.xlsx se regenera.
// ============================================================================
import * as XLSX from "xlsx";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(PROJECT_ROOT, "Bitacora-cambios.xlsx");

// --- Registro de cambios (el más reciente al final) ---
const cambios = [
  {
    "No.": 1,
    Fecha: "2026-09-23",
    Módulo: "Histórico",
    "Cambio realizado":
      "El módulo Histórico ahora inicia en blanco: al entrar solo se muestra un mensaje para seleccionar un periodo, sin datos.",
    "Archivos modificados": "src/pages/HistoricoPage.tsx",
    Estado: "Completado",
  },
  {
    "No.": 2,
    Fecha: "2026-09-23",
    Módulo: "Histórico",
    "Cambio realizado":
      'Se agregó un selector (arriba a la derecha) con la opción "PREP 2023 - 2024", con el mismo estilo del proyecto.',
    "Archivos modificados": "src/pages/HistoricoPage.tsx",
    Estado: "Completado",
  },
  {
    "No.": 3,
    Fecha: "2026-09-23",
    Módulo: "Histórico",
    "Cambio realizado":
      'La información (avance general, filtros y tabla de actividades) solo se muestra al seleccionar "PREP 2023 - 2024" en el selector.',
    "Archivos modificados": "src/pages/HistoricoPage.tsx",
    Estado: "Completado",
  },
  {
    "No.": 4,
    Fecha: "2026-09-23",
    Módulo: "Menú lateral / PREP 26-27",
    "Cambio realizado":
      'Se convirtió "PREP 26-27" en un submenú desplegable con dos opciones: "32 entregables" (vista /proyeccion) y "54 entregables" (vista /prep54). Se quitó el ítem separado "PREP (54)". No se modificaron datos ni el diseño de las páginas.',
    "Archivos modificados": "src/components/AppSidebar.tsx",
    Estado: "Completado",
  },
  {
    "No.": 5,
    Fecha: "2026-09-23",
    Módulo: "PREP 26-27 / 32 entregables",
    "Cambio realizado":
      'Se cambió el título de la vista de "PREP 26 – 27 (Actualizado)" a "PREP 26 – 27 (32 entregables)".',
    "Archivos modificados": "src/pages/ProyeccionPage.tsx",
    Estado: "Completado",
  },
  {
    "No.": 6,
    Fecha: "2026-09-23",
    Módulo: "Importar (nuevo)",
    "Cambio realizado":
      'Se creó el módulo "Importar" (solo administradores) con dos áreas de carga: una para el Excel de 32 entregables (PREP-32) y otra para el de 54 entregables (PREP-54). Fase 1: al subir el archivo lo lee, valida y muestra vista previa (columnas + filas). El guardado en base de datos se conectará tras confirmar el mapeo de columnas.',
    "Archivos modificados": "src/pages/ImportarPage.tsx, src/App.tsx, src/components/AppSidebar.tsx",
    Estado: "En progreso (Fase 1 completada)",
  },
  {
    "No.": 7,
    Fecha: "2026-09-23",
    Módulo: "Importar",
    "Cambio realizado":
      'Se homologaron los nombres de las áreas de importación: ambas ahora indican "(PREP 26-27)".',
    "Archivos modificados": "src/pages/ImportarPage.tsx",
    Estado: "Completado",
  },
  {
    "No.": 8,
    Fecha: "2026-09-23",
    Módulo: "PREP 26-27 / 32 entregables",
    "Cambio realizado":
      'Se quitó la columna "Remisión INE 1" del nivel 1 de la tabla (encabezado y filas). Se conserva "Remisión INE 2". No se modificó la exportación a Excel.',
    "Archivos modificados": "src/pages/ProyeccionPage.tsx",
    Estado: "Completado",
  },
  {
    "No.": 9,
    Fecha: "2026-09-23",
    Módulo: "Importar",
    "Cambio realizado":
      "Se definió el flujo en 4 pasos: 1) Importar (elegir archivo), 2) Validar (leer y previsualizar), 3) Guardar (almacenar el archivo validado), 4) Actualizar (previsualiza cómo se aplicarían las fechas del Excel a los 3 niveles: entregable=1 nivel 1, 1.1 nivel 2, 1.1.1 nivel 3). Botones habilitados en secuencia. Pendiente: conectar la escritura real en base tras confirmar el mapeo de columnas del Excel.",
    "Archivos modificados": "src/pages/ImportarPage.tsx",
    Estado: "En progreso",
  },
  {
    "No.": 10,
    Fecha: "2026-09-23",
    Módulo: "PREP 26-27 / 32 entregables",
    "Cambio realizado":
      'Se renombró la fecha final a "Fin" en los 3 niveles: nivel 1 (antes "Remisión INE 2") y niveles 2 y 3 (antes "Término"). No se modificó la exportación a Excel.',
    "Archivos modificados": "src/pages/ProyeccionPage.tsx",
    Estado: "Completado",
  },
  {
    "No.": 11,
    Fecha: "2026-09-23",
    Módulo: "Importar / Backend local",
    "Cambio realizado":
      'El paso "3. Guardar" ahora guarda el Excel en el servidor local, en la carpeta local-server/storage/imports/, con historial (nombre con fecha/hora, no reemplaza). Se agregaron endpoints en el backend: POST /import/save y GET /import/list/:key. La carpeta de importaciones se añadió al .gitignore (copia local, no versionada).',
    "Archivos modificados": "local-server/server.js, src/pages/ImportarPage.tsx, .gitignore",
    Estado: "Completado",
  },
  {
    "No.": 12,
    Fecha: "2026-09-23",
    Módulo: "Importar / 32 entregables",
    "Cambio realizado":
      'El paso "4. Actualizar" ya escribe en la base para el archivo de 32 entregables: aplica las fechas del Excel a los 3 niveles. Nivel 1 -> activity_date_overrides (inicio/termino por activity_id). Niveles 2 y 3 -> activity_text_overrides (fechas codificadas en |||DATES:, conservando el texto). Detecta columnas Nivel/Actividad/Inicio/Fin y normaliza fechas tipo "sáb 01/08/26" a formato ISO. Sobrescribe fechas existentes (confirmado por el usuario).',
    "Archivos modificados": "src/pages/ImportarPage.tsx",
    Estado: "Completado",
  },
  {
    "No.": 13,
    Fecha: "2026-09-24",
    Módulo: "PREP 26-27 / 32 entregables + Importar",
    "Cambio realizado":
      'Se agregó una marca visible en el encabezado de "32 entregables" que confirma que los 3 niveles fueron actualizados conforme al Excel, con la fecha de la última actualización. Al completar el paso 4 (Actualizar) se guarda la marca; el backend expone POST /import/mark y GET /import/mark/:key (guardada en local-server/storage/imports/_applied_PREP-32.json).',
    "Archivos modificados": "local-server/server.js, src/pages/ImportarPage.tsx, src/pages/ProyeccionPage.tsx",
    Estado: "Completado",
  },
  {
    "No.": 14,
    Fecha: "2026-09-24",
    Módulo: "Backend local (fix fechas)",
    "Cambio realizado":
      'Se corrigió el error "Invalid Date" en la columna INICIO de 32 entregables. Causa: la librería pg devolvía las columnas DATE como objeto con hora y la app arma la fecha con valor + \'T00:00:00\'. Solución: se configuró pg para devolver DATE (OID 1082) como texto YYYY-MM-DD. También arregla las fechas del Calendario.',
    "Archivos modificados": "local-server/server.js",
    Estado: "Completado",
  },
  {
    "No.": 15,
    Fecha: "2026-09-24",
    Módulo: "PREP (54) / Gantt",
    "Cambio realizado":
      'Se agregó el título "Estatus" a la columna de estatus del Gantt (antes no tenía encabezado). La columna muestra un semáforo automático por fechas: Entregado (fin en mes actual/anterior), Por entregar (fin el mes siguiente), En Proceso (ya inició), Pendiente (aún no inicia). No se modificó el diseño.',
    "Archivos modificados": "src/pages/Prep54Page.tsx",
    Estado: "Completado",
  },
  {
    "No.": 16,
    Fecha: "2026-09-24",
    Módulo: "Importar / PREP (54)",
    "Cambio realizado":
      'Se corrigió el importador de PREP-54 para su estructura de un solo nivel: se identifica por la columna "No." (1–54), sin niveles. El parser de fechas ahora entiende formato con mes en letras (01-Aug-26 / 11-sep-2026). El paso 4 (Actualizar) escribe las fechas en la tabla nueva date_overrides_54 y la vista PREP (54) las sobrepone al Gantt por número de entregable; la duración y el estatus se recalculan automáticamente. La vista previa muestra No./Entregable/Inicio/Fin (ya no Nivel).',
    "Archivos modificados": "src/pages/ImportarPage.tsx, src/pages/Prep54Page.tsx, local-server/server.js, (tabla date_overrides_54)",
    Estado: "Completado",
  },
  {
    "No.": 17,
    Fecha: "2026-09-24",
    Módulo: "PREP (54) / Gantt",
    "Cambio realizado":
      'Se ocultó en el tooltip del Gantt la leyenda "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable" (venía en el campo observaciones de algunos entregables). Solo se oculta esa leyenda; las observaciones reales siguen mostrándose. No se borraron datos.',
    "Archivos modificados": "src/pages/Prep54Page.tsx",
    Estado: "Completado",
  },
  {
    "No.": 18,
    Fecha: "2026-09-24",
    Módulo: "32 entregables + Dashboard",
    "Cambio realizado":
      "Seguimiento por avance real: al marcar el check de las subtareas, el nivel 1 muestra el % acumulado = (subtareas de último nivel marcadas ÷ total de hojas). Al llegar a 100% el entregable se muestra como Entregado y se cuenta como tal. En el Dashboard, las alertas ahora IGNORAN las subtareas marcadas y los entregables completos (ya no aparecen como Vencida/Próxima). Entregables sin subtareas: 100% solo si su estatus es Entregado. Solo lógica; no se cambió estructura ni diseño.",
    "Archivos modificados": "src/hooks/usePrepActivitiesWithSubs.ts, src/pages/Index.tsx, src/pages/ProyeccionPage.tsx",
    Estado: "Completado",
  },
  {
    "No.": 19,
    Fecha: "2026-09-24",
    Módulo: "Reportes + Histórico",
    "Cambio realizado":
      'Reportes se reestructuró como submenú (igual que PREP 26-27) con 3 submódulos: 32 entregables (/reportes/32), 54 entregables (/reportes/54) y Comparativo (/reportes/comparativo); se quitaron las pestañas internas y /reportes redirige a /reportes/32. El reporte del Histórico se movió al módulo Histórico: al seleccionar el periodo aparece un interruptor Actividades/Reporte; la vista Reporte muestra las gráficas históricas (nuevo componente HistoricoReporte). El menú lateral ahora soporta múltiples submenús.',
    "Archivos modificados": "src/components/AppSidebar.tsx, src/App.tsx, src/pages/ReportesPage.tsx, src/pages/HistoricoPage.tsx, src/components/HistoricoReporte.tsx",
    Estado: "Completado",
  },
  {
    "No.": 20,
    Fecha: "2026-09-24",
    Módulo: "Backend local / Respaldos",
    "Cambio realizado":
      "Se agregaron scripts de respaldo y restauración de la base local: local-server/backup-db.ps1 (genera .sql con fecha en local-server/backups/, conserva los últimos 10) y local-server/restore-db.ps1 (restaura el más reciente o uno indicado). Scripts npm: 'npm run db:backup' y 'npm run db:restore'. La carpeta backups/ se excluyó de Git. Respaldo probado OK.",
    "Archivos modificados": "local-server/backup-db.ps1, local-server/restore-db.ps1, package.json, .gitignore",
    Estado: "Completado",
  },
  {
    "No.": 21,
    Fecha: "2026-09-24",
    Módulo: "Pruebas / Calidad",
    "Cambio realizado":
      "Se extrajo la lógica de avance por hojas (computeEntregableProgress) y de alertas del Dashboard (buildAlerts) a un módulo puro src/lib/alerts.ts, y se agregaron pruebas unitarias (src/test/alerts.test.ts, 9 casos): cálculo por hojas opción B y exclusión de subtareas marcadas / entregables completos / status Entregado en las alertas. El hook reexporta computeEntregableProgress; el Dashboard usa buildAlerts. Todas las pruebas pasan.",
    "Archivos modificados": "src/lib/alerts.ts, src/hooks/usePrepActivitiesWithSubs.ts, src/pages/Index.tsx, src/test/alerts.test.ts",
    Estado: "Completado",
  },
];

// --- Construcción del Excel ---
const encabezados = ["No.", "Fecha", "Módulo", "Cambio realizado", "Archivos modificados", "Estado"];
const hoja = XLSX.utils.json_to_sheet(cambios, { header: encabezados });

// Anchos de columna para que se lea cómodo
hoja["!cols"] = [
  { wch: 5 },   // No.
  { wch: 12 },  // Fecha
  { wch: 16 },  // Módulo
  { wch: 70 },  // Cambio realizado
  { wch: 30 },  // Archivos modificados
  { wch: 14 },  // Estado
];

const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, hoja, "Cambios");
XLSX.writeFile(libro, OUTPUT);

console.log(`Bitácora generada: ${OUTPUT} (${cambios.length} cambios)`);
