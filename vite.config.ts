import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isLocal = mode === "localdev";

  const shimPath = path.resolve(__dirname, "./src/integrations/supabase/localClient.ts");

  // Usamos alias en formato ARRAY para controlar el orden de resolucion.
  // El alias especifico (cliente supabase -> shim local) DEBE ir ANTES del
  // alias generico "@", porque Vite evalua en orden y se queda con el primero.
  const alias: Array<{ find: string | RegExp; replacement: string }> = [];
  if (isLocal) {
    // Cubre tanto el import por "@/..." como por ruta relativa que resuelva al archivo fisico.
    alias.push({ find: "@/integrations/supabase/client", replacement: shimPath });
    alias.push({ find: /^(.*)integrations\/supabase\/client(\.ts)?$/, replacement: shimPath });
  }
  alias.push({ find: "@", replacement: path.resolve(__dirname, "./src") });

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      watch: {
        ignored: ['**/*.xlsx', '**/*.xlsm', '**/*.xls']
      }
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias,
    },
  };
});
