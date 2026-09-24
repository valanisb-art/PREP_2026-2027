# ============================================================================
# Restauración de la base local prep_local (Dashboard PREP 26-27)
# Restaura un respaldo .sql generado por backup-db.ps1.
#
# USO (desde PowerShell, dentro de Dashboard_Final):
#   .\local-server\restore-db.ps1                  # restaura el MÁS RECIENTE
#   .\local-server\restore-db.ps1 -File "ruta.sql" # restaura uno específico
#
# NOTA: el respaldo incluye DROP ... IF EXISTS, por lo que reemplaza el
# contenido actual de prep_local. Cierra el sistema (npm run dev:local) antes
# de restaurar para evitar conflictos de conexión.
# ============================================================================

param([string]$File = "")

# --- Configuración ---
$PgBin      = "C:\Program Files\PostgreSQL\18\bin"
$PgUser     = "postgres"
$PgPassword = "postgres"
$PgPort     = "5433"
$DbName     = "prep_local"
$BackupDir  = Join-Path $PSScriptRoot "backups"

# --- No edites debajo de esta línea ---
$ErrorActionPreference = "Stop"
$psql = Join-Path $PgBin "psql.exe"
$env:PGPASSWORD = $PgPassword

if (-not (Test-Path $psql)) {
  Write-Host "ERROR: no se encontró psql en $psql" -ForegroundColor Red
  exit 1
}

# Si no se indicó archivo, tomar el respaldo más reciente
if (-not $File) {
  $latest = Get-ChildItem -Path $BackupDir -Filter "prep_local_*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latest) {
    Write-Host "ERROR: no hay respaldos en $BackupDir. Ejecuta primero backup-db.ps1." -ForegroundColor Red
    exit 1
  }
  $File = $latest.FullName
}

if (-not (Test-Path $File)) {
  Write-Host "ERROR: no se encontró el archivo de respaldo: $File" -ForegroundColor Red
  exit 1
}

Write-Host "Se va a RESTAURAR '$DbName' desde:" -ForegroundColor Yellow
Write-Host "  $File" -ForegroundColor Yellow
$confirm = Read-Host "Esto reemplazará los datos actuales. ¿Continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
  Write-Host "Restauración cancelada." -ForegroundColor DarkGray
  exit 0
}

# Asegurar que la base exista (por si es un equipo nuevo)
& $psql -h localhost -p $PgPort -U $PgUser -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$DbName';" -t | Out-Null
& $psql -h localhost -p $PgPort -U $PgUser -d postgres -c "CREATE DATABASE $DbName;" 2>$null | Out-Null

Write-Host "Restaurando..." -ForegroundColor Cyan
& $psql -h localhost -p $PgPort -U $PgUser -d $DbName -f $File 2>&1 | Out-Null

Write-Host ""
Write-Host "Restauración completada." -ForegroundColor Green
Write-Host "Verificación:" -ForegroundColor Green
& $psql -h localhost -p $PgPort -U $PgUser -d $DbName -c "SELECT (SELECT count(*) FROM public.entregables_54) AS e54, (SELECT count(*) FROM public.sub_actividades) AS subs;"
