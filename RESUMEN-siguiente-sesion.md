# Resumen para continuar — Dashboard PREP 26-27

_Última actualización: 2026-09-24_

## Cómo levantar el entorno local
1. En PowerShell dentro de `Dashboard_Final`:
   ```powershell
   npm.cmd run dev:local
   ```
   (usar `npm.cmd`, no `npm`, por la política de ejecución de PowerShell)
2. Navegador: **http://localhost:8080/** (recarga fuerte con **Ctrl + Shift + R** si algo no aparece).
3. Login: `victor.alanis@ieem.org.mx` / `prep2026` (admin).

## Datos técnicos clave
- **PostgreSQL 18**, puerto **5433**, base **`prep_local`**, usuario/clave `postgres` / `postgres`.
- Backend Express local: `http://localhost:54321`. Web (Vite): `8080`.
- El backend (`local-server/server.js`) NO recarga solo: si se edita, reiniciar `dev:local`.
- Bitácora de cambios (desarrollo): `Bitacora-cambios.xlsx` → **21 cambios**. Se regenera con `node scripts/generar-bitacora.mjs`.
- Respaldos de la base: `npm run db:backup` (crea .sql en `local-server/backups/`, guarda últimos 10) y `npm run db:restore` (restaura el último o `-File`).
- Pruebas: `npm test` (vitest). Hay pruebas en `src/test/alerts.test.ts` (9 casos, pasan).

## Lo que se hizo (resumen histórico de cambios)
1–3. **Histórico**: inicia en blanco; selector "PREP 2023 - 2024"; muestra info al elegir; además interruptor **Actividades / Reporte** (ver punto 19).
4. **Menú lateral**: submenús desplegables (genéricos) para PREP 26-27 y Reportes.
5–10. **32 entregables**: título "PREP 26 – 27 (32 entregables)"; se quitó "Remisión INE 1"; fecha final renombrada a "Fin" en los 3 niveles.
6–12. **Importar** (solo admin): flujo de 4 pasos (Importar → Validar → Guardar → Actualizar). Guarda el Excel en `local-server/storage/imports/` con historial. Actualiza fechas en los 3 niveles (32) y en el Gantt (54).
13. **Marca** "3 niveles actualizados conforme al Excel" en la vista de 32.
14. **Fix** de fechas: `pg` devuelve DATE como texto (arregló "Invalid Date").
15. **PREP (54)**: título "Estatus" en la columna del Gantt.
16. **Importar 54**: estructura de un solo nivel (por "No."), fechas con mes en letras (01-Aug-26), overrides en tabla `date_overrides_54` que el Gantt sobrepone; duración y estatus se recalculan solos.
17. **PREP (54)**: se ocultó la leyenda "No se identificó una actividad..." del tooltip.
18. **Seguimiento por avance real**: al marcar el check de subtareas, el nivel 1 muestra % acumulado (hojas marcadas ÷ total hojas, opción B); a 100% pasa a "Entregado". Las alertas del Dashboard excluyen lo marcado / completado.
19. **Reportes → submenú** (32 / 54 / Comparativo) con rutas `/reportes/32|54|comparativo`; el reporte del Histórico se movió al módulo Histórico (interruptor Actividades/Reporte, componente `HistoricoReporte`).
20. **Respaldos** de la base local (scripts + `npm run db:backup`/`db:restore`).
21. **Pruebas** unitarias: se extrajo la lógica pura a `src/lib/alerts.ts` (computeEntregableProgress y buildAlerts) + pruebas.

## Pendientes / próximos temas
1. **Despliegue a producción (GitHub + Vercel + Supabase):**
   - Código: `git add . && git commit && git push` → Vercel reconstruye. Subir TODO el proyecto (no solo `src`). Variables de entorno de Vercel ya configuradas.
   - Supabase (estructura): crear la tabla nueva **`date_overrides_54`** (SQL) con **RLS igual a las otras tablas de overrides**. Es la única tabla nueva; el resto ya existe.
   - Supabase (datos): sincronizar los overrides de local → Supabase (`date_overrides_54`, `activity_date_overrides`, `activity_text_overrides`, `activity_status`).
   - OJO: el módulo **Importar** y el backend Express son LOCALES; en Vercel el paso "Guardar" no funciona. Recomendado: importar en local y sincronizar datos a Supabase.
   - PENDIENTE OFRECIDO: preparar el **SQL exacto** (tabla + políticas RLS clonadas) y un **script de exportación** de los overrides locales para pegar en Supabase.

2. **Alertas por correo de los 54 (por fecha fin):**
   - Ya existe `scripts/send-alerts.ts` + `.github/workflows/weekly_alerts.yml` + `alert_emails.json` (usa Resend). Manda correo con fecha límite y enlace a Google Calendar.
   - Ajustes por definir: leer fecha fin desde `date_overrides_54` (local), usar la lógica de estatus/checks, adjuntar invitación `.ics`, y decidir **nube (GitHub Actions)** vs **local (Tarea Programada Windows)** + proveedor (Resend con dominio verificado o SMTP institucional).

3. **Mejoras sugeridas (no hechas):** Planeado vs Real (curva S), semáforo por área/tema, entregables en riesgo, bitácora/auditoría de usuarios en la app, validaciones en Importar (fin<inicio, duplicados, reemplazar vs combinar), seguridad de endpoints `/import/*` (sin auth), limpieza de código muerto en ReportesPage (bloque histórico `{false && ...}`).
