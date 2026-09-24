# ============================================================================
# Instalador de la base de datos local para el Dashboard PREP 26-27
# Crea la base prep_local, restaura el dump y siembra las credenciales locales.
#
# USO (desde PowerShell, dentro de la carpeta Dashboard_Final):
#   .\local-server\install-db.ps1
#
# Requisitos: PostgreSQL instalado. Ajusta las variables de abajo si tu
# instalacion difiere (version, usuario, contraseña, ruta del dump).
# ============================================================================

# --- Configuracion (ajusta segun tu equipo) ---
$PgBin      = "C:\Program Files\PostgreSQL\18\bin"   # Carpeta bin de PostgreSQL
$PgUser     = "postgres"                              # Usuario de PostgreSQL
$PgPassword = "postgres"                               # Contraseña de ese usuario
$PgPort     = "5433"                                  # Puerto de PostgreSQL
$DbName     = "prep_local"                            # Nombre de la base local
$DumpFile   = Join-Path $PSScriptRoot "..\..\dump-postgres-202609221251.sql"  # Dump (carpeta padre)
$SetupFile  = Join-Path $PSScriptRoot "setup.sql"     # Setup de auth local
$SeedFile   = Join-Path $PSScriptRoot "seed-users.sql" # Usuarios admin adicionales

# --- No edites debajo de esta linea ---
$ErrorActionPreference = "Stop"
$psql = Join-Path $PgBin "psql.exe"
$env:PGPASSWORD = $PgPassword

if (-not (Test-Path $psql)) {
  Write-Host "ERROR: no se encontro psql en $psql" -ForegroundColor Red
  Write-Host "Ajusta la variable `$PgBin en este script a tu version de PostgreSQL." -ForegroundColor Yellow
  exit 1
}
if (-not (Test-Path $DumpFile)) {
  Write-Host "ERROR: no se encontro el dump en $DumpFile" -ForegroundColor Red
  Write-Host "Coloca 'dump-postgres-202609221251.sql' en la carpeta padre de Dashboard_Final, o ajusta `$DumpFile." -ForegroundColor Yellow
  exit 1
}

Write-Host "1/4 Verificando conexion a PostgreSQL..." -ForegroundColor Cyan
& $psql -h localhost -p $PgPort -U $PgUser -d postgres -c "SELECT version();" -t | Out-Null

Write-Host "2/4 Creando base de datos '$DbName' (si existe, se recrea)..." -ForegroundColor Cyan
& $psql -h localhost -p $PgPort -U $PgUser -d postgres -c "DROP DATABASE IF EXISTS $DbName;" | Out-Null
& $psql -h localhost -p $PgPort -U $PgUser -d postgres -c "CREATE DATABASE $DbName;" | Out-Null

Write-Host "3/4 Restaurando el dump (esto crea las tablas y datos)..." -ForegroundColor Cyan
# El dump referencia el esquema auth de Supabase; algunos errores de rol/FK son
# esperables y no afectan los datos del esquema public.
& $psql -h localhost -p $PgPort -U $PgUser -d $DbName -f $DumpFile 2>&1 | Out-Null

Write-Host "4/5 Aplicando setup de auth local (columnas + contraseñas)..." -ForegroundColor Cyan
& $psql -h localhost -p $PgPort -U $PgUser -d $DbName -f $SetupFile | Out-Null

Write-Host "5/5 Sembrando usuarios administradores adicionales..." -ForegroundColor Cyan
if (Test-Path $SeedFile) {
  & $psql -h localhost -p $PgPort -U $PgUser -d $DbName -f $SeedFile | Out-Null
}

Write-Host ""
Write-Host "Base de datos lista." -ForegroundColor Green
Write-Host "Verificacion de tablas:" -ForegroundColor Green
& $psql -h localhost -p $PgPort -U $PgUser -d $DbName -c "SELECT count(*) AS entregables_54 FROM public.entregables_54; SELECT count(*) AS sub_actividades FROM public.sub_actividades;"
Write-Host ""
Write-Host "Usuarios de acceso (contraseña: prep2026):" -ForegroundColor Green
Write-Host "  - victor.alanis@ieem.org.mx (admin)"
Write-Host "  - aldo.acevedo@ieem.org.mx (admin)"
Write-Host "  - jorgeisacctalita@gmail.com (admin)"
Write-Host "  - alekei1200@gmail.com"
