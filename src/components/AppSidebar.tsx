import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, List, FileBarChart, Clock, LogOut, Shield, User, Sun, Moon, CalendarDays, ClipboardList, X, ChevronDown, ChevronRight, Upload, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
interface NavItem {
  to?: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  hideForInvitado?: boolean;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { to: "/historico", label: "Histórico", icon: Clock, hideForInvitado: true },
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  {
    label: "PREP 26-27",
    icon: List,
    children: [
      { to: "/proyeccion", label: "32 entregables", icon: List },
      { to: "/prep54", label: "54 entregables", icon: ClipboardList, hideForInvitado: true },
    ],
  },
  {
    label: "Reportes",
    icon: FileBarChart,
    children: [
      { to: "/reportes/32", label: "32 entregables", icon: List },
      { to: "/reportes/54", label: "54 entregables", icon: ClipboardList, hideForInvitado: true },
      { to: "/reportes/comparativo", label: "Comparativo", icon: ArrowRightLeft },
    ],
  },
  { to: "/importar", label: "Importar", icon: Upload, adminOnly: true },
  { to: "/admin", label: "Administración", icon: Shield, adminOnly: true },
];

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operativo: "Operativo",
  invitado: "Invitado",
};

const roleColors: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive",
  operativo: "bg-info/15 text-info",
  invitado: "bg-muted text-muted-foreground",
};

export default function AppSidebar({ onClose }: { onClose?: () => void } = {}) {
  const location = useLocation();
  const { user, role, signOut } = useAuth();

  // Submenús desplegables: se abren solos si estamos en una de sus rutas hijas.
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setOpenMenus((prev) => {
      const next = { ...prev };
      navItems.forEach((it) => {
        if (it.children && it.children.some((c) => c.to && location.pathname.startsWith(c.to))) {
          next[it.label] = true;
        }
      });
      return next;
    });
  }, [location.pathname]);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <aside className="h-screen w-64 bg-sidebar flex flex-col shadow-xl md:shadow-none select-none">
      <div className="p-5 border-b border-sidebar-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Clock className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground tracking-wide">PREP 2027</h1>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Seguimiento</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden min-h-0">
        {navItems
          .filter((item) => {
            if (item.adminOnly && role !== "admin") return false;
            if (item.hideForInvitado && role === "invitado") return false;
            return true;
          })
          .map((item) => {
            // --- Submenú desplegable (con children) ---
            if (item.children) {
              const visibleChildren = item.children.filter((c) => {
                if (c.adminOnly && role !== "admin") return false;
                if (c.hideForInvitado && role === "invitado") return false;
                return true;
              });
              if (visibleChildren.length === 0) return null;
              const childActive = visibleChildren.some((c) => c.to === location.pathname);
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => setOpenMenus((m) => ({ ...m, [item.label]: !m[item.label] }))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                      ${childActive
                        ? "text-sidebar-foreground font-semibold"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {openMenus[item.label]
                      ? <ChevronDown className="w-4 h-4 ml-auto shrink-0" />
                      : <ChevronRight className="w-4 h-4 ml-auto shrink-0" />}
                  </button>
                  {openMenus[item.label] && (
                    <div className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-1">
                      {visibleChildren.map((child) => {
                        const isActive = location.pathname === child.to;
                        return (
                          <Link
                            key={child.to}
                            to={child.to!}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                              ${isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                              }`}
                          >
                            <child.icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            // --- Ítem simple (enlace directo) ---
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to!}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
      </nav>
      <div className="p-4 border-t border-sidebar-border space-y-3">
        {user && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-sidebar-foreground/60" />
              <span className="text-xs text-sidebar-foreground/80 truncate">{user.email}</span>
            </div>
            {role && (
              <Badge variant="outline" className={`text-[10px] ${roleColors[role] || ""}`}>
                {roleLabels[role] || role}
              </Badge>
            )}
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors w-full"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDark ? <Moon className="w-3.5 h-3.5 text-sidebar-foreground/60" /> : <Sun className="w-3.5 h-3.5 text-sidebar-foreground/60" />}
            <span className="text-xs text-sidebar-foreground/70">{isDark ? "Oscuro" : "Claro"}</span>
          </div>
          <Switch checked={isDark} onCheckedChange={setIsDark} className="scale-90" />
        </div>
        <div>
          <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-wider">IEEM · UIE</p>
          <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">Jornada: 6 Jun 2027</p>
        </div>
      </div>
    </aside>
  );
}
