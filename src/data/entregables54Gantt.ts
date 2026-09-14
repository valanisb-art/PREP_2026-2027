// Data extracted from Excel: "Resumen_Relacion_Entregables_PREP_Calendario_Electoral_2027"
// Sheet: "ENTREGABLES 54"

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
}

// Helper to convert Excel serial date to YYYY-MM-DD
function excelDate(serial: number): string {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().split("T")[0];
}

export const TEMAS_COLORES: Record<string, string> = {
  "Instalación y Coordinación del PREP": "#6366f1",
  "Comité Técnico Asesor (COTAPREP)": "#8b5cf6",
  "Plan de Trabajo de Implementación del PREP": "#a855f7",
  "Informes de Seguimiento Mensual": "#0ea5e9",
  "Ente Auditor": "#14b8a6",
  "Capacitación del PREP": "#22c55e",
  "Catálogos y Diseño de Actas": "#eab308",
  "Sistemas de Captura y Verificación": "#f97316",
  "Pruebas del Sistema PREP": "#ef4444",
  "Simulacros del PREP": "#ec4899",
  "Difusores del PREP": "#d946ef",
  "Operación y Publicación del PREP": "#f43f5e",
  "Cierre y Evaluación Final": "#64748b",
};

export const ESTATUS_COLORES: Record<string, string> = {
  "RELACIÓN DIRECTA": "#22c55e",
  "RELACIÓN INDIRECTA": "#eab308",
  "SIN RELACIÓN": "#ef4444",
  "RELACIÓN DIRECTA E INDIRECTA": "#3b82f6",
};

const rawData: Array<[number, string, string, string, string, number, number, string, number, number, string, string]> = [
  [1, "Entregable No. 1", "Acuerdo por el que se informa la instalación de la Comisión que dará seguimiento a la implementación y operación del PREP.", "Instalación y Coordinación del PREP", "CG-IEEM", 46235, 46276, "No.9 (Directa)", 1, 0, "RELACIÓN DIRECTA", ""],
  [2, "Entregable No. 2", "Acuerdo por el que se designa o ratifica a la instancia interna responsable de coordinar el desarrollo de las actividades del PREP.", "Instalación y Coordinación del PREP", "CG-IEEM", 46235, 46276, "No.9 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [3, "Entregable No. 3", "Informe del mes de septiembre sobre el avance en la implementación y operación del PREP.", "Informes de Seguimiento Mensual", "UIE", 46280, 46300, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [4, "Entregable No. 4", "Proyecto de Acuerdo de integración del Comité Técnico Asesor del PREP. ", "Comité Técnico Asesor (COTAPREP)", "CEPAPREP", 46258, 46301, "No.33 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [5, "Entregable No. 6", "Plan de trabajo para la implementación del PREP, que deberá contener al menos los siguientes temas:", "Plan de Trabajo de Implementación del PREP", "", 46265, 46301, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [6, "Entregable No. 3", "Informe del mes de octubre sobre el avance en la implementación y operación del PREP.", "Informes de Seguimiento Mensual", "UIE", 46301, 46331, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [7, "Entregable No. 4", "Acuerdo de integración del Comité Técnico Asesor del PREP. ", "Comité Técnico Asesor (COTAPREP)", "CG-IEEM", 46258, 46337, "No.33 (Directa)", 1, 0, "RELACIÓN DIRECTA", ""],
  [8, "Entregable No. 5", "Plan de trabajo y calendario de sesiones y reuniones formales de trabajo con las representaciones de partidos políticos y, en su caso, candidaturas independientes del Comité Técnico Asesor del PREP.", "Comité Técnico Asesor (COTAPREP)", "COTAPREP", 46279, 46337, "No.33 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [9, "Entregable No. 3", "Informe del mes de noviembre sobre el avance en la implementación y operación del PREP.", "Informes de Seguimiento Mensual", "UIE", 46332, 46361, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [10, "Entregable No. 6", "Plan de Trabajo para la implementación del PREP. (versión revisada por el COTAPREP).", "Plan de Trabajo de Implementación del PREP", "CEPAPREP", 46265, 46362, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [11, "Entregable No. 8", "Proyecto de Acuerdo por el que se determina el Proceso Técnico Operativo.", "Proceso Técnico Operativo", "CEPAPREP", 46296, 46362, "No.52 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [12, "Entregable No. 7", "Documento por el que se determina que la implementación y operación del PREP se realiza únicamente por el OPL, o con apoyo de un tercero.", "Determinación de Implementación (OPL/Tercero)", "CG-IEEM", 46335, 46367, "No.42 (Directa)", 1, 0, "RELACIÓN DIRECTA", ""],
  [13, "Entregable No. 3", "Informe del mes de diciembre sobre el avance en la implementación y operación del PREP.", "Informes de Seguimiento Mensual", "UIE", 46362, 46392, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [14, "Entregable No. 10", "La versión preliminar del instrumento jurídico celebrado entre el OPL y el tercero que lo auxilie en la implementación y operación del PREP, así como su anexo técnico que forme parte de éste.", "Instrumento Jurídico con Tercero", "N/A (contingente a tercero)", 46357, 46393, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [15, "Entregable No. 11", "La versión preliminar del prototipo navegable del sitio de publicación y formato de bases de datos que se utilizarán en la operación del PREP.", "Prototipo Navegable y Publicación", "UIE / COTAPREP", 46266, 46393, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [16, "Entregable No. 12", "Proyecto de Acuerdo por el que se determina la ubicación de los CATD, y en su caso CCV, y por el que se instruye su instalación y habilitación.", "Centros de Acopio y Transmisión de Datos (CATD/CCV)", "CEPAPREP", 46357, 46393, "No.69 (Indirecta); No.60 (Indirecta)", 0, 2, "RELACIÓN INDIRECTA", ""],
  [17, "Entregable No. 13", "Proyecto de Acuerdo por el que se instruye a los Consejos Distritales o Municipales, según corresponda para que supervisen las actividades relacionadas con la implementación y operación del PREP en los CATD y, en su caso CCV.", "Centros de Acopio y Transmisión de Datos (CATD/CCV)", "CEPAPREP", 46342, 46393, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [18, "Entregable No. 8", "Acuerdo por el que se determina el Proceso Técnico Operativo.", "Proceso Técnico Operativo", "CG-IEEM", 46296, 46398, "No.52 (Directa)", 1, 0, "RELACIÓN DIRECTA", ""],
  [19, "Entregable No. 9", "El o los candidatos a entes auditores, así como la síntesis de su experiencia en materia de auditorías.", "Ente Auditor", "UIE / COTAPREP / CEPAPREP", 46357, 46398, "No.68 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [20, "Entregable No. 3", "Informe del mes de enero sobre el avance en la implementación y operación del PREP.", "Informes de Seguimiento Mensual", "UIE", 46393, 46423, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [21, "Entregable No. 15", "Versión preliminar del instrumento jurídico celebrado entre el OPL y el ente auditor, así como su anexo técnico.", "Ente Auditor", "DJC / UIE / COTAPREP / CEPAPREP", 46395, 46424, "No.89 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [22, "Entregable No. 10", "En su caso, instrumento jurídico celebrado entre el OPL y el tercero que lo auxilie en la implementación y operación del PREP, así como su anexo técnico que forme parte de éste.", "Instrumento Jurídico con Tercero", "N/A (contingente a tercero)", 46357, 46429, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [23, "Entregable No. 11", "El Prototipo navegable del sitio de publicación y formato de base de datos que se utilizará en la operación del PREP.  (versión revisada por el COTAPREP).", "Prototipo Navegable y Publicación", "UIE / COTAPREP", 46266, 46429, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [24, "Entregable No. 12", "Acuerdo por el que se determina la ubicación de los CATD y, en su caso CCV, y por el que se instruye su instalación y habilitación.", "Centros de Acopio y Transmisión de Datos (CATD/CCV)", "CG-IEEM", 46357, 46429, "No.69 (Directa); No.94 (Indirecta)", 1, 1, "RELACIÓN DIRECTA E INDIRECTA", ""],
  [25, "Entregable No. 13", "Acuerdo por el que se instruye a los Consejos Distritales o Municipales, según corresponda, para que supervisen las actividades relacionadas con la implementación y operación del PREP en los CATD y, en su caso, CCV.", "Centros de Acopio y Transmisión de Datos (CATD/CCV)", "CG-IEEM", 46342, 46429, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [26, "Entregable No. 14", "Designación  y aceptación del ente auditor.", "Ente Auditor", "CG-IEEM", 46405, 46424, "No.68 (Directa)", 1, 0, "RELACIÓN DIRECTA", ""],
  [27, "Entregable No. 3", "Informe del mes de febrero sobre el avance en la implementación y operación del PREP.", "Informes de Seguimiento Mensual", "UIE", 46424, 46451, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [28, "Entregable No. 16", "Versión preliminar del Plan de Seguridad y Plan de Continuidad.", "Plan de Seguridad y Continuidad", "UIE / COTAPREP", 46054, 46452, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [29, "Entregable No. 15", "En su caso, instrumento jurídico celebrado entre el OPL y el ente auditor, así como su anexo técnico.", "Ente Auditor", "DJC / IEEM", 46395, 46457, "No.89 (Directa)", 1, 0, "RELACIÓN DIRECTA", ""],
  [30, "Entregable No. 17", "Proyecto de Acuerdo por el que se determina la fecha y hora de inicio de la publicación de los datos e imágenes de los resultados electorales preliminares.", "Parámetros de Publicación de Resultados", "COTAPREP / CEPAPREP", 46434, 46468, "No.157 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [31, "Entregable No. 18", "Proyecto de Acuerdo por el que se determina el número de actualizaciones por hora de los datos (el número mínimo  deberá ser de tres por hora).", "Parámetros de Publicación de Resultados", "COTAPREP / CEPAPREP", 46434, 46468, "No.157 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [32, "Entregable No. 19", "Proyecto de Acuerdo por el que se determina el número de actualizaciones por hora de las bases de datos que contengan los resultados electorales preliminares (el número mínimo deberá ser de tres por hora).", "Parámetros de Publicación de Resultados", "COTAPREP / CEPAPREP", 46434, 46468, "No.157 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [33, "Entregable No. 20", "Proyecto de Acuerdo por el que se determina la fecha y hora de publicación de la última actualización de datos e imágenes de los resultados electorales preliminares.", "Parámetros de Publicación de Resultados", "COTAPREP / CEPAPREP", 46434, 46468, "No.157 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [34, "Entregable No. 3", "Informe del mes de marzo sobre el avance en la implementación y operación del PREP.", "Informes de Seguimiento Mensual", "UIE", 46452, 46482, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [35, "Entregable No. 16", "Plan de Seguridad y Plan de Continuidad.", "Plan de Seguridad y Continuidad", "CEPAPREP", 46054, 46488, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [36, "Entregable No. 17", "Acuerdo por el que se determina la fecha y hora de inicio de la publicación de los datos e imágenes de los resultados electorales preliminares.", "Parámetros de Publicación de Resultados", "CG-IEEM", 46434, 46488, "No.157 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [37, "Entregable No. 18", "Acuerdo por el que se determina el número de actualizaciones por hora de los datos (el número mínimo  deberá ser de tres por hora).", "Parámetros de Publicación de Resultados", "CG-IEEM", 46434, 46488, "No.157 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [38, "Entregable No. 19", "Acuerdo por el que se determina el número de actualizaciones por hora, de las bases de datos que contengan los resultados electorales preliminares (el número mínimo deberá ser de tres por hora).", "Parámetros de Publicación de Resultados", "CG-IEEM", 46434, 46488, "No.157 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [39, "Entregable No. 20", "Acuerdo por el que se determina la fecha y hora de publicación de la última actualización de datos e imágenes de los resultados electorales preliminares.", "Parámetros de Publicación de Resultados", "CG-IEEM", 46434, 46488, "No.157 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [40, "Entregable No. 21", "Documento por el que se informa de la fecha, hora y lugar de ejecución de la prueba para verificar el correcto funcionamiento del sistema informático del PREP.", "Pruebas del Sistema PREP", "UIE / COTAPREP / CEPAPREP", 46469, 46493, "No.124 (Directa)", 1, 0, "RELACIÓN DIRECTA", ""],
  [41, "Entregable No. 22", "Procedimiento para consultar vía remota el sitio de publicación que se utilizará durante la ejecución de la o las pruebas.", "Pruebas del Sistema PREP", "UIE / COTAPREP / CEPAPREP", 46469, 46495, "No.124 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [42, "Entregable No. 23", "Informe de evaluación de la ejecución de la prueba.", "Pruebas del Sistema PREP", "UIE / COTAPREP / CEPAPREP", 46494, 46503, "No.124 (Directa)", 1, 0, "RELACIÓN DIRECTA", ""],
  [43, "Entregable No. 3", "Informe del mes de abril sobre el avance en la implementación y operación del PREP.", "Informes de Seguimiento Mensual", "UIE", 46483, 46512, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [44, "Entregable No. 26", "Las dirección electrónica del prototipo navegable que se utilizará durante la ejecución de los simulacros del PREP. ", "Simulacros del PREP", "UIE / COTAPREP", 46514, 46520, "No.141 (Indirecta); No.125 (Indirecta)", 0, 2, "RELACIÓN INDIRECTA", ""],
  [45, "Entregable No. 26", "La dirección electrónica de publicación que se utilizará durante la operación del PREP.", "Operación y Publicación del PREP", "No especificado en el documento", 46514, 46539, "No.157 (Directa); No.135 (Indirecta)", 1, 1, "RELACIÓN DIRECTA E INDIRECTA", ""],
  [46, "Entregable No. 24", "Documento por medio del cual se realiza la convocatoria o invitación a participar como difusores del PREP, y documento por el cual se formaliza la participación del o los difusores del PREP, siempre y cuando se tengan difusores oficiales, en caso contrario, el documento por el cual se informa que “El OPL” será el único que publique los resultados electorales preliminares. ", "Difusores del PREP", "DJC / UIE / COTAPREP", 46478, 46539, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [47, "Entregable No. 25", "En su caso, lista de los difusores oficiales y sus direcciones electrónicas (en su caso).", "Difusores del PREP", "UIE / COTAPREP / CEPAPREP", 46492, 46539, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [48, "Entregable No. 3", "Informe del mes de mayo sobre el avance en la implementación y operación del PREP.", "Informes de Seguimiento Mensual", "UIE", 46513, 46543, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [49, "Entregable No. 27", "Informe general del desempeño en todos los simulacros.", "Simulacros del PREP", "UIE / COTAPREP / CEPAPREP", 46535, 46543, "No.141 (Directa); No.143 (Directa); No.147 (Directa)", 3, 0, "RELACIÓN DIRECTA", ""],
  [50, "Entregable No. 28", "El Acta circunstanciada del cierre de la publicación del PREP.", "Operación y Publicación del PREP", "SE / UIE", 46544, 46550, "No.157 (Directa)", 1, 0, "RELACIÓN DIRECTA", ""],
  [51, "Entregable No. 32", "Informe final del Comité Técnico Asesor. ", "Cierre y Evaluación Final", "COTAPREP / CEPAPREP", 46555, 46568, "No especificado en el documento", 0, 0, "SIN RELACIÓN", "No se identificó una actividad del Calendario Electoral 2027 que corresponda objetivamente a este entregable."],
  [52, "Entregable No. 29", "Informes final y de evaluación de la operación emitidos por el ente auditor.", "Cierre y Evaluación Final", "ENTE AUDITOR / COTAPREP / CEPAPREP", 46527, 46574, "No.157 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [53, "Entregable No. 30", "Constancias de los actos que deben ser atestiguados por un tercero con fe pública, de acuerdo con lo establecido en el Anexo 13, Lineamientos del PREP del Reglamento de Elecciones.", "Cierre y Evaluación Final", "UIE / COTAPREP / CEPAPREP", 46510, 46574, "No.149 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
  [54, "Entregable No. 31", "Informe final del PREP. (el informe deberá considerar lo dispuesto por el lineamiento 33, entregable 31 del Anexo 13, Lineamientos del PREP).", "Cierre y Evaluación Final", "UIE / COTAPREP / CEPAPREP", 46545, 46574, "No.157 (Indirecta)", 0, 1, "RELACIÓN INDIRECTA", ""],
];

export const entregables54Gantt: Entregable54Gantt[] = rawData.map(
  ([no, entregable, descripcion, tema, responsable, inicio, fin, actividadesRelacionadas, relacionesDirectas, relacionesIndirectas, estatusRelacion, observaciones]) => ({
    no,
    entregable,
    descripcion,
    tema,
    responsable,
    inicio: excelDate(inicio),
    fin: excelDate(fin),
    actividadesRelacionadas,
    relacionesDirectas,
    relacionesIndirectas,
    estatusRelacion,
    observaciones,
  })
);

// Ordered list of unique temas for grouping
export const TEMAS_ORDEN: string[] = [
  "Instalación y Coordinación del PREP",
  "Comité Técnico Asesor (COTAPREP)",
  "Plan de Trabajo de Implementación del PREP",
  "Informes de Seguimiento Mensual",
  "Ente Auditor",
  "Capacitación del PREP",
  "Catálogos y Diseño de Actas",
  "Sistemas de Captura y Verificación",
  "Pruebas del Sistema PREP",
  "Simulacros del PREP",
  "Difusores del PREP",
  "Operación y Publicación del PREP",
  "Cierre y Evaluación Final",
];

// Unique responsables
export const RESPONSABLES: string[] = Array.from(
  new Set(rawData.map((r) => r[4]))
).sort();
