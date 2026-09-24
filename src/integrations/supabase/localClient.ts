// ============================================================================
// Shim del cliente Supabase para modo LOCAL.
// Implementa la superficie de @supabase/supabase-js que usa la app, pero
// hablando con el backend Express local (local-server/server.js).
//
// Se activa reemplazando el import de "@/integrations/supabase/client" via
// alias de Vite cuando se corre con `npm run dev:local`.
// ============================================================================

const API_BASE = (import.meta.env.VITE_LOCAL_API_URL as string) || "http://localhost:54321";
const TOKEN_KEY = "prep_local_token";
const USER_KEY = "prep_local_user";

type AnyObj = Record<string, any>;

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
function getStoredUser(): AnyObj | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
function setSession(user: AnyObj | null, token: string | null) {
  if (user && token) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: AnyObj = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (e: any) {
    return {
      data: null,
      error: {
        message: `No se pudo conectar con el servidor local (${API_BASE}). ¿Está corriendo "npm run dev:local"? Detalle: ${e.message}`,
      },
    };
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // La respuesta no es JSON (probablemente HTML por caché vieja o ruta incorrecta)
    return {
      data: null,
      error: {
        message: `Respuesta no válida del servidor local (esperaba JSON). Recarga la página con Ctrl+Shift+R para limpiar la caché. URL: ${API_BASE}${path}`,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Query builder que emula supabase.from(table)...
// ---------------------------------------------------------------------------
class QueryBuilder {
  private table: string;
  private _op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private _columns = "*";
  private _filters: Array<{ col: string; val: any }> = [];
  private _order: { col: string; ascending: boolean } | null = null;
  private _values: any = null;
  private _onConflict: string | null = null;
  private _single: "single" | "maybe" | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*") {
    // .select() puede usarse tras insert/update para pedir el resultado;
    // en ese caso NO cambiamos la operacion, solo las columnas.
    if (this._op === "select") {
      this._op = "select";
    }
    this._columns = columns;
    return this;
  }

  insert(values: any) {
    this._op = "insert";
    this._values = values;
    return this;
  }

  update(values: any) {
    this._op = "update";
    this._values = values;
    return this;
  }

  delete() {
    this._op = "delete";
    return this;
  }

  upsert(values: any, opts?: { onConflict?: string }) {
    this._op = "upsert";
    this._values = values;
    this._onConflict = opts?.onConflict ?? null;
    return this;
  }

  eq(col: string, val: any) {
    this._filters.push({ col, val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this._order = { col, ascending: opts?.ascending !== false };
    return this;
  }

  single() {
    this._single = "single";
    return this.exec();
  }

  maybeSingle() {
    this._single = "maybe";
    return this.exec();
  }

  private async exec(): Promise<{ data: any; error: any }> {
    const body: AnyObj = {
      op: this._op,
      columns: this._columns,
      filters: this._filters,
      order: this._order,
      values: this._values,
      onConflict: this._onConflict,
      single: this._single,
    };
    try {
      const json = await apiFetch(`/db/${this.table}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { data: json.data, error: json.error };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }

  // Hace "thenable" al builder para que `await supabase.from(x).select()...`
  // funcione sin llamar single()/maybeSingle().
  then(resolve: (v: { data: any; error: any }) => any, reject?: (e: any) => any) {
    return this.exec().then(resolve, reject);
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
type AuthCallback = (event: string, session: AnyObj | null) => void;
const authListeners: AuthCallback[] = [];

function currentSession(): AnyObj | null {
  const user = getStoredUser();
  const token = getToken();
  if (user && token) {
    return { access_token: token, user };
  }
  return null;
}

function notifyAuth(event: string) {
  const session = currentSession();
  authListeners.forEach((cb) => cb(event, session));
}

const auth = {
  async getSession() {
    return { data: { session: currentSession() }, error: null };
  },

  async getUser() {
    const user = getStoredUser();
    return { data: { user: user ?? null }, error: null };
  },

  onAuthStateChange(cb: AuthCallback) {
    authListeners.push(cb);
    // Emitir estado inicial async (como hace supabase-js)
    setTimeout(() => cb("INITIAL_SESSION", currentSession()), 0);
    return {
      data: {
        subscription: {
          unsubscribe() {
            const idx = authListeners.indexOf(cb);
            if (idx >= 0) authListeners.splice(idx, 1);
          },
        },
      },
    };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const json = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (json.error) return { data: { user: null, session: null }, error: json.error };
    setSession(json.user, json.access_token);
    notifyAuth("SIGNED_IN");
    return { data: { user: json.user, session: currentSession() }, error: null };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: AnyObj }) {
    const full_name = options?.data?.full_name ?? "";
    const json = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
    if (json.error) return { data: { user: null, session: null }, error: json.error };
    setSession(json.user, json.access_token);
    notifyAuth("SIGNED_IN");
    return { data: { user: json.user, session: currentSession() }, error: null };
  },

  async signInAnonymously() {
    const json = await apiFetch("/auth/anonymous", { method: "POST", body: "{}" });
    if (json.error) return { data: { user: null, session: null }, error: json.error };
    setSession(json.user, json.access_token);
    notifyAuth("SIGNED_IN");
    return { data: { user: json.user, session: currentSession() }, error: null };
  },

  async signOut() {
    setSession(null, null);
    notifyAuth("SIGNED_OUT");
    return { error: null };
  },
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
function storageFrom(_bucket: string) {
  return {
    async upload(path: string, file: File) {
      const fd = new FormData();
      fd.append("path", path);
      fd.append("file", file);
      const json = await apiFetch("/storage/upload", { method: "POST", body: fd });
      return { data: json.data, error: json.error };
    },
    async remove(paths: string[]) {
      const json = await apiFetch("/storage/remove", {
        method: "POST",
        body: JSON.stringify({ paths }),
      });
      return { data: json.data, error: json.error };
    },
    async createSignedUrl(path: string, expiresIn = 3600) {
      const json = await apiFetch("/storage/sign", {
        method: "POST",
        body: JSON.stringify({ path, expiresIn }),
      });
      return { data: json.data, error: json.error };
    },
  };
}

// ---------------------------------------------------------------------------
// Realtime (no-op: la app refresca con refetch manual; los canales existen
// para no romper el codigo, pero no emiten eventos en modo local).
// ---------------------------------------------------------------------------
function channel(_name: string) {
  const ch: AnyObj = {
    on() {
      return ch;
    },
    subscribe() {
      return ch;
    },
  };
  return ch;
}

function removeChannel(_ch: any) {
  return Promise.resolve({ error: null });
}

// ---------------------------------------------------------------------------
// RPC
// ---------------------------------------------------------------------------
async function rpc(fn: string, args?: AnyObj) {
  const json = await apiFetch(`/rpc/${fn}`, {
    method: "POST",
    body: JSON.stringify(args || {}),
  });
  return { data: json.data, error: json.error };
}

// ---------------------------------------------------------------------------
export const supabase = {
  from: (table: string) => new QueryBuilder(table),
  auth,
  rpc,
  storage: { from: storageFrom },
  channel,
  removeChannel,
};
