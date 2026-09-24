# Dashboard PREP 26-27 — Guía para correr el proyecto en local

Esta guía explica cómo levantar el sistema completo en tu máquina, sin necesidad
de conexión a Supabase. Todo corre localmente: la base de datos, el backend y la
aplicación web.

## 1. Requisitos (instalar una sola vez)

| Software | Versión | Dónde conseguirlo |
|---|---|---|
| **Node.js** | LTS (18+) | https://nodejs.org (instalador Windows .msi) |
| **PostgreSQL** | 16, 17 o 18 | https://www.postgresql.org/download/windows/ |

Durante la instalación de PostgreSQL, **recuerda la contraseña** que le pongas al
usuario `postgres`. La necesitarás en el paso 3.

> Después de instalar, cierra y vuelve a abrir la terminal para que reconozca
> `node`, `npm` y `psql`.

## 2. Instalar las dependencias del proyecto

Abre PowerShell dentro de la carpeta `Dashboard_Final` y ejecuta:

```powershell
npm install
```

## 3. Crear la base de datos local

El proyecto incluye un script que crea la base, restaura el dump y deja todo listo.

1. Asegúrate de que el archivo **`dump-postgres-202609221251.sql`** esté en la
   carpeta **padre** de `Dashboard_Final` (es decir, junto a la carpeta del proyecto).
2. Si tu PostgreSQL NO es la versión 18, o tu contraseña de `postgres` no es `12345`,
   abre `local-server/install-db.ps1` y ajusta las variables `$PgBin` y `$PgPassword`
   al inicio del archivo.
3. Ejecuta el instalador desde la carpeta `Dashboard_Final`:

```powershell
.\local-server\install-db.ps1
```

Al terminar deberías ver el conteo de tablas y los usuarios de acceso.

## 4. Configurar las variables de entorno local

Crea un archivo llamado **`.env.localdev`** dentro de `Dashboard_Final` con este contenido:

```
VITE_LOCAL_API_URL="http://localhost:54321"
VITE_SUPABASE_URL="http://localhost:54321"
VITE_SUPABASE_PUBLISHABLE_KEY="local-dev"
VITE_SUPABASE_PROJECT_ID="prep-local"
```

> Si tu contraseña de `postgres` no es `12345`, además crea un archivo `.env` en la
> misma carpeta con: `PGPASSWORD="tu-contraseña"` (el backend lo lee para conectarse).

## 5. Levantar el sistema

Desde `Dashboard_Final`, un solo comando arranca el backend y la web juntos:

```powershell
npm run dev:local
```

Luego abre en el navegador:

**http://localhost:8080/**

## 6. Iniciar sesión

| Usuario | Contraseña | Rol |
|---|---|---|
| `victor.alanis@ieem.org.mx` | `prep2026` | Administrador |
| `aldo.acevedo@ieem.org.mx` | `prep2026` | Administrador |
| `jorgeisacctalita@gmail.com` | `prep2026` | Administrador |
| `alekei1200@gmail.com` | `prep2026` | (según base) |

---

## Cómo funciona (resumen técnico)

- El sistema fue construido con Supabase (Auth + base de datos + Storage).
- Para correrlo **sin Supabase**, se agregó:
  - `local-server/server.js`: un backend Express que emula la API de Supabase
    hablando con el PostgreSQL local (base `prep_local`).
  - `src/integrations/supabase/localClient.ts`: un "shim" que reemplaza al cliente
    de Supabase. Se activa mediante un alias en `vite.config.ts` cuando se corre
    con `--mode localdev` (el script `dev:local`).
- El modo original con Supabase sigue intacto: `npm run dev` usa Supabase;
  `npm run dev:local` usa el entorno local. No se modificó ningún componente.

## Problemas comunes

- **"Error al iniciar sesión / Unexpected token '<'"**: recarga con `Ctrl+Shift+R`
  para limpiar la caché del navegador.
- **El login falla con "No se pudo conectar con el servidor local"**: revisa que
  `npm run dev:local` esté corriendo y que el servicio de PostgreSQL esté activo.
- **`psql` no se reconoce**: PostgreSQL no está en el PATH; usa la ruta completa
  o ajusta `$PgBin` en el script.
