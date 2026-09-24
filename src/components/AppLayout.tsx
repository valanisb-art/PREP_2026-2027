import { ReactNode, useState } from "react";
import AppSidebar from "./AppSidebar";
import { Menu, X } from "lucide-react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background relative flex flex-col md:flex-row">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed on mobile with slide-in, static docked on desktop/tablet */}
      <div
        className={`fixed md:sticky top-0 h-screen z-50 transition-transform duration-200 ease-in-out shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 min-h-screen relative watermark-prueba-piloto flex flex-col">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors text-xs font-medium"
            aria-label="Abrir menú"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>Menú</span>
          </button>
          <span className="font-bold text-sm text-foreground tracking-wide">PREP 2027</span>
          <div className="w-12" />
        </div>

        {/* Content Container - fluid and responsive to window resizing */}
        <div className="p-4 sm:p-6 md:p-8 max-w-[1920px] w-full relative z-10 mx-auto flex-1 transition-all duration-200">
          {children}
        </div>
      </main>
    </div>
  );
}
