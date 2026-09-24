# ============================================================================
# Respaldo de la base local prep_local (Dashboard PREP 26-27)
# Genera un archivo .sql con fecha/hora en local-server/backups/ y conserva
# los últimos 10 respaldos.
#
# USO (desde PowerShell, dentro de Dashboard_Final):
#   .\local-server\backup-db.ps1
# ============================================================================

# --- Configuración (ajusta si tu instalación difiere) ---
$PgBin      = "C:\Program Files\PostgreSQL\18\bin"
$PgUser     = "postgres"
$PgPassword = "postgres"
$PgPort     = "5433"
$DbName     = "prep_local"
$BackupDir  = Join-Path $PSScriptRoot "backups"
$KeepLast   = 10

# --- No edites debajo de esta línea ---
$ErrorActionPreference = "Stop"
$pgDump = Join-Path $PgBin "pg_dump.exe"
$env:PGPASSWORD = $PgPassword

if (-not (Test-Path $pgDump)) {
  Write-Host "ERROR: no se encontró pg_dump en $pgDump" -ForegroundColor Red
  Write-Host "Ajusta la variable `$PgBin en este script a tu versión de PostgreSQL." -ForegroundColor Yellow
  exit 1
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp   = Get-Date -Format "yyyyMMdd_HHmmss"
$outFile = Join-Path $BackupDir "prep_local_$stamp.sql"

Write-Host "Respaldando '$DbName' (puerto $PgPort)..." -ForegroundColor Cyan
# --clean --if-exists: el respaldo incluye los DROP para poder restaurarlo encima.
& $pgDump -h localhost -p $PgPort -U $PgUser -d $DbName --clean --if-exists --encoding=UTF8 -f $outFile

if (-not (Test-Path $outFile)) {
  Write-Host "ERROR: no se generó el archivo de respaldo." -ForegroundColor Red
  exit 1
}

$sizeKB = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
Write-Host ""
Write-Host "Respaldo creado: $outFile ($sizeKB KB)" -ForegroundColor Green

# Conservar solo los últimos N respaldos
$backups = Get-ChildItem -Path $BackupDir -Filter "prep_local_*.sql" | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt $KeepLast) {
  $backups | Select-Object -Skip $KeepLast | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Respaldo antiguo eliminado: $($_.Name)" -ForegroundColor DarkGray
  }
}

Write-Host ""
Write-Host "Respaldos disponibles (más reciente primero):" -ForegroundColor Green
Get-ChildItem -Path $BackupDir -Filter "prep_local_*.sql" | Sort-Object LastWriteTime -Descending | ForEach-Object {
  Write-Host ("  {0}  ({1:N1} KB)" -f $_.Name, ($_.Length / 1KB))
}
