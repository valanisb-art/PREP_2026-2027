// ============================================================================
// Backend local para el Dashboard PREP 26-27
// Emula la superficie de Supabase (auth + REST por tabla + RPC + storage)
// hablando con el PostgreSQL local (base prep_local).
//
// NO usar en produccion. Solo para correr el sistema localmente sin Supabase.
// ============================================================================
import express from "express";
import cors from "cors";
import pkg from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

// ---------------------------------------------------------------------------
// Carga de .env (opcional). Permite configurar la conexion a PostgreSQL sin
// editar este archivo: util al mover el proyecto a otra computadora donde la
// contraseña de 'postgres' sea distinta.
// Claves soportadas: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE,
//                    LOCAL_API_PORT, LOCAL_JWT_SECRET
// ---------------------------------------------------------------------------
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    // Quitar comillas envolventes si las tiene
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    // Las variables reales del sistema tienen prioridad sobre el archivo
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(path.join(PROJECT_ROOT, ".env"));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = process.env.LOCAL_API_PORT || 54321;
const JWT_SECRET = process.env.LOCAL_JWT_SECRET || "prep-local-dev-secret-cambia-esto";
const STORAGE_DIR = path.join(__dirname, "storage");
const BUCKET = "evidencias";

const { Pool, types } = pkg;
// Devolver columnas DATE (OID 1082) como texto "YYYY-MM-DD" en vez de objeto Date.
// La app arma las fechas con `valor + 'T00:00:00'`, por lo que necesita el string plano.
types.setTypeParser(1082, (v) => v);
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "12345",
  database: process.env.PGDATABASE || "prep_local",
  max: 10,
});

// Aseguramos carpeta de storage
fs.mkdirSync(path.join(STORAGE_DIR, BUCKET), { recursive: true });

// Tablas permitidas (whitelist) para el endpoint REST generico
const ALLOWED_TABLES = new Set([
  "activity_status",
  "activity_evidence",
  "custom_activities",
  "custom_sub_activities",
  "deleted_activities",
  "activity_text_overrides",
  "activity_date_overrides",
  "date_overrides_54",
  "hidden_static_subs",
  "entregables_54",
  "entregables_32",
  "sub_actividades",
  "profiles",
  "user_roles",
]);

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, is_anonymous: !!user.is_anonymous },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function userFromReq(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET);
    return { id: p.sub, email: p.email, is_anonymous: p.is_anonymous };
  } catch {
    return null;
  }
}

// Convierte un identificador de columna/tabla a algo seguro (solo [a-z0-9_])
function safeIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Identificador invalido: ${name}`);
  }
  return `"${name}"`;
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

// login con email + password
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: { message: "Email y contraseña requeridos" } });
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, email, password_hash FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    const u = rows[0];
    if (!u || !u.password_hash) {
      return res.status(400).json({ error: { message: "Credenciales inválidas" } });
    }
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) {
      return res.status(400).json({ error: { message: "Credenciales inválidas" } });
    }
    const user = { id: u.id, email: u.email, is_anonymous: false };
    return res.json({ user, access_token: signToken(user) });
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  }
});

// registro (crea auth.users + dispara handle_new_user via trigger para profiles/user_roles)
app.post("/auth/signup", async (req, res) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: { message: "Email y contraseña requeridos" } });
  }
  const client = await pool.connect();
  try {
    const exists = await client.query(`SELECT 1 FROM auth.users WHERE lower(email)=lower($1)`, [email]);
    if (exists.rowCount > 0) {
      return res.status(400).json({ error: { message: "El usuario ya existe" } });
    }
    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO auth.users (id, email, password_hash, raw_user_meta_data)
       VALUES ($1, $2, $3, $4)`,
      [id, email, hash, JSON.stringify({ full_name: full_name || "" })]
    );
    // Emular handle_new_user por si el trigger no existe en local
    await client.query(
      `INSERT INTO public.profiles (id, full_name, email)
       VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [id, full_name || "", email]
    );
    await client.query(
      `INSERT INTO public.user_roles (user_id, role)
       VALUES ($1, 'invitado') ON CONFLICT DO NOTHING`,
      [id]
    );
    const user = { id, email, is_anonymous: false };
    return res.json({ user, access_token: signToken(user) });
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  } finally {
    client.release();
  }
});

// login anonimo (invitado)
app.post("/auth/anonymous", async (_req, res) => {
  const id = crypto.randomUUID();
  const user = { id, email: null, is_anonymous: true };
  return res.json({ user, access_token: signToken(user) });
});

// validar sesion actual
app.get("/auth/user", (req, res) => {
  const user = userFromReq(req);
  if (!user) return res.status(401).json({ error: { message: "No autenticado" } });
  return res.json({ user });
});

// ---------------------------------------------------------------------------
// RPC
// ---------------------------------------------------------------------------
app.post("/rpc/:fn", async (req, res) => {
  const fn = req.params.fn;
  const args = req.body || {};
  try {
    if (fn === "get_user_role") {
      const userId = args._user_id;
      if (!userId) return res.json({ data: null, error: null });
      const { rows } = await pool.query(
        `SELECT role FROM public.user_roles WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      return res.json({ data: rows[0]?.role ?? null, error: null });
    }
    if (fn === "delete_user_by_admin") {
      const targetId = args.target_user_id;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM public.user_roles WHERE user_id = $1`, [targetId]);
        await client.query(`DELETE FROM public.profiles WHERE id = $1`, [targetId]);
        await client.query(`DELETE FROM auth.users WHERE id = $1`, [targetId]);
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
      return res.json({ data: null, error: null });
    }
    return res.status(404).json({ data: null, error: { message: `RPC no soportada: ${fn}` } });
  } catch (e) {
    return res.json({ data: null, error: { message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// REST generico por tabla (estilo PostgREST simplificado)
// Body: { op, columns, filters:[{col,val}], order:{col,ascending}, values, onConflict, single }
// ---------------------------------------------------------------------------
app.post("/db/:table", async (req, res) => {
  const table = req.params.table;
  if (!ALLOWED_TABLES.has(table)) {
    return res.json({ data: null, error: { message: `Tabla no permitida: ${table}` } });
  }
  const { op, columns, filters = [], order, values, onConflict, single } = req.body || {};
  const T = safeIdent(table);

  try {
    // ---- SELECT ----
    if (op === "select") {
      const cols = !columns || columns === "*"
        ? "*"
        : columns.split(",").map((c) => safeIdent(c.trim())).join(", ");
      const params = [];
      let sql = `SELECT ${cols} FROM public.${T}`;
      if (filters.length) {
        const clauses = filters.map((f, i) => {
          params.push(f.val);
          return `${safeIdent(f.col)} = $${i + 1}`;
        });
        sql += ` WHERE ${clauses.join(" AND ")}`;
      }
      if (order && order.col) {
        sql += ` ORDER BY ${safeIdent(order.col)} ${order.ascending === false ? "DESC" : "ASC"}`;
      }
      const { rows } = await pool.query(sql, params);
      if (single === "single") {
        if (rows.length !== 1) return res.json({ data: null, error: { message: "No single row" } });
        return res.json({ data: rows[0], error: null });
      }
      if (single === "maybe") {
        return res.json({ data: rows[0] ?? null, error: null });
      }
      return res.json({ data: rows, error: null });
    }

    // ---- INSERT ----
    if (op === "insert") {
      const arr = Array.isArray(values) ? values : [values];
      if (!arr.length) return res.json({ data: [], error: null });
      const keys = Object.keys(arr[0]);
      const colList = keys.map(safeIdent).join(", ");
      const allParams = [];
      const rowsSql = arr.map((row) => {
        const ph = keys.map((k) => {
          allParams.push(row[k]);
          return `$${allParams.length}`;
        });
        return `(${ph.join(", ")})`;
      });
      const sql = `INSERT INTO public.${T} (${colList}) VALUES ${rowsSql.join(", ")} RETURNING *`;
      const { rows } = await pool.query(sql, allParams);
      return res.json({ data: rows, error: null });
    }

    // ---- UPDATE ----
    if (op === "update") {
      const keys = Object.keys(values || {});
      const params = [];
      const sets = keys.map((k) => {
        params.push(values[k]);
        return `${safeIdent(k)} = $${params.length}`;
      });
      let sql = `UPDATE public.${T} SET ${sets.join(", ")}`;
      if (filters.length) {
        const clauses = filters.map((f) => {
          params.push(f.val);
          return `${safeIdent(f.col)} = $${params.length}`;
        });
        sql += ` WHERE ${clauses.join(" AND ")}`;
      }
      sql += " RETURNING *";
      const { rows } = await pool.query(sql, params);
      return res.json({ data: rows, error: null });
    }

    // ---- DELETE ----
    if (op === "delete") {
      const params = [];
      let sql = `DELETE FROM public.${T}`;
      if (filters.length) {
        const clauses = filters.map((f) => {
          params.push(f.val);
          return `${safeIdent(f.col)} = $${params.length}`;
        });
        sql += ` WHERE ${clauses.join(" AND ")}`;
      }
      sql += " RETURNING *";
      const { rows } = await pool.query(sql, params);
      return res.json({ data: rows, error: null });
    }

    // ---- UPSERT ----
    if (op === "upsert") {
      const arr = Array.isArray(values) ? values : [values];
      if (!arr.length) return res.json({ data: [], error: null });
      const keys = Object.keys(arr[0]);
      const colList = keys.map(safeIdent).join(", ");
      const allParams = [];
      const rowsSql = arr.map((row) => {
        const ph = keys.map((k) => {
          allParams.push(row[k]);
          return `$${allParams.length}`;
        });
        return `(${ph.join(", ")})`;
      });
      const conflictCols = (onConflict || "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .map(safeIdent)
        .join(", ");
      const updates = keys
        .filter((k) => !(onConflict || "").split(",").map((s) => s.trim()).includes(k))
        .map((k) => `${safeIdent(k)} = EXCLUDED.${safeIdent(k)}`)
        .join(", ");
      let sql = `INSERT INTO public.${T} (${colList}) VALUES ${rowsSql.join(", ")}`;
      if (conflictCols) {
        sql += ` ON CONFLICT (${conflictCols}) DO ${updates ? `UPDATE SET ${updates}` : "NOTHING"}`;
      }
      sql += " RETURNING *";
      const { rows } = await pool.query(sql, allParams);
      return res.json({ data: rows, error: null });
    }

    return res.json({ data: null, error: { message: `Operacion no soportada: ${op}` } });
  } catch (e) {
    return res.json({ data: null, error: { message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// STORAGE (bucket "evidencias" en disco)
// ---------------------------------------------------------------------------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// subir archivo: el path viene en el campo "path"
app.post("/storage/upload", upload.single("file"), (req, res) => {
  try {
    const relPath = req.body.path;
    if (!relPath || !req.file) {
      return res.json({ data: null, error: { message: "path y file requeridos" } });
    }
    const dest = path.join(STORAGE_DIR, BUCKET, relPath);
    // Evitar path traversal
    if (!dest.startsWith(path.join(STORAGE_DIR, BUCKET))) {
      return res.json({ data: null, error: { message: "path invalido" } });
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, req.file.buffer);
    return res.json({ data: { path: relPath }, error: null });
  } catch (e) {
    return res.json({ data: null, error: { message: e.message } });
  }
});

// borrar archivos: body { paths: [...] }
app.post("/storage/remove", (req, res) => {
  try {
    const paths = req.body.paths || [];
    for (const p of paths) {
      const dest = path.join(STORAGE_DIR, BUCKET, p);
      if (dest.startsWith(path.join(STORAGE_DIR, BUCKET)) && fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
    }
    return res.json({ data: {}, error: null });
  } catch (e) {
    return res.json({ data: null, error: { message: e.message } });
  }
});

// crear signed url: body { path, expiresIn }
app.post("/storage/sign", (req, res) => {
  try {
    const { path: relPath, expiresIn = 3600 } = req.body || {};
    if (!relPath) return res.json({ data: null, error: { message: "path requerido" } });
    const exp = Math.floor(Date.now() / 1000) + Number(expiresIn);
    const token = jwt.sign({ path: relPath, exp }, JWT_SECRET);
    const signedUrl = `http://localhost:${PORT}/storage/object?token=${encodeURIComponent(token)}`;
    return res.json({ data: { signedUrl }, error: null });
  } catch (e) {
    return res.json({ data: null, error: { message: e.message } });
  }
});

// servir el objeto firmado
app.get("/storage/object", (req, res) => {
  try {
    const token = req.query.token;
    const payload = jwt.verify(token, JWT_SECRET);
    const dest = path.join(STORAGE_DIR, BUCKET, payload.path);
    if (!dest.startsWith(path.join(STORAGE_DIR, BUCKET)) || !fs.existsSync(dest)) {
      return res.status(404).send("No encontrado");
    }
    return res.sendFile(dest);
  } catch {
    return res.status(403).send("URL invalida o expirada");
  }
});

// ---------------------------------------------------------------------------
// IMPORTACIONES (guardar los Excel subidos, con historial por fecha)
// Carpeta: local-server/storage/imports/
// Nombre: <key>_YYYY-MM-DD_HHmmss<ext>  (no reemplaza; conserva historial)
// ---------------------------------------------------------------------------
const IMPORTS_DIR = path.join(STORAGE_DIR, "imports");
fs.mkdirSync(IMPORTS_DIR, { recursive: true });

app.post("/import/save", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: "Archivo (file) requerido" } });
    }
    const key = String(req.body.key || "archivo").replace(/[^a-zA-Z0-9_-]/g, "");
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const ext = path.extname(req.file.originalname) || ".xlsx";
    const fileName = `${key}_${stamp}${ext}`;
    const dest = path.join(IMPORTS_DIR, fileName);
    // Evitar path traversal
    if (!dest.startsWith(IMPORTS_DIR)) {
      return res.status(400).json({ error: { message: "Ruta inválida" } });
    }
    fs.writeFileSync(dest, req.file.buffer);
    return res.json({ data: { fileName, savedAt: now.toISOString() }, error: null });
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  }
});

// Listar el historial de un tipo de importación (mas reciente primero)
app.get("/import/list/:key", (req, res) => {
  try {
    const key = String(req.params.key).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!fs.existsSync(IMPORTS_DIR)) return res.json({ data: [], error: null });
    const files = fs
      .readdirSync(IMPORTS_DIR)
      .filter((f) => f.startsWith(key + "_"))
      .map((f) => {
        const st = fs.statSync(path.join(IMPORTS_DIR, f));
        return { fileName: f, size: st.size, savedAt: st.mtime.toISOString() };
      })
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    return res.json({ data: files, error: null });
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  }
});

// Marca de "última actualización aplicada desde Excel" por tipo (prep32/prep54)
app.post("/import/mark", (req, res) => {
  try {
    const key = String(req.body.key || "").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!key) return res.status(400).json({ error: { message: "key requerido" } });
    const marker = {
      appliedAt: new Date().toISOString(),
      fileName: req.body.fileName || null,
      nivel1: req.body.nivel1 ?? null,
      nivel2y3: req.body.nivel2y3 ?? null,
    };
    fs.writeFileSync(path.join(IMPORTS_DIR, `_applied_${key}.json`), JSON.stringify(marker), "utf8");
    return res.json({ data: marker, error: null });
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  }
});

app.get("/import/mark/:key", (req, res) => {
  try {
    const key = String(req.params.key).replace(/[^a-zA-Z0-9_-]/g, "");
    const f = path.join(IMPORTS_DIR, `_applied_${key}.json`);
    if (!fs.existsSync(f)) return res.json({ data: null, error: null });
    return res.json({ data: JSON.parse(fs.readFileSync(f, "utf8")), error: null });
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  }
});

// ---------------------------------------------------------------------------
app.get("/health", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT current_database() AS db");
    res.json({ ok: true, db: rows[0].db });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, async () => {
  let dbName = "(desconocida)";
  try {
    const { rows } = await pool.query("SELECT current_database() AS db");
    dbName = rows[0].db;
  } catch {
    /* se reportara en /health */
  }
  console.log(`\n[local-server] API local escuchando en http://localhost:${PORT}`);
  console.log(`[local-server] DB: ${dbName}  |  Storage: ${path.join(STORAGE_DIR, BUCKET)}\n`);
});
