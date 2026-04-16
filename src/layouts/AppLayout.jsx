import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const desktopSidebarWidth = desktopCollapsed
    ? 'lg:pl-[88px]'
    : 'lg:pl-[280px]';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header móvil */}
      <header
        className="
          sticky top-0 z-40 flex h-14 items-center justify-between
          border-b border-zinc-800 bg-black/95 backdrop-blur
          px-4 lg:hidden
          pt-[env(safe-area-inset-top)]
          pl-[max(1rem,env(safe-area-inset-left))]
          pr-[max(1rem,env(safe-area-inset-right))]
        "
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 transition hover:bg-zinc-900"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <h1 className="max-w-[180px] truncate text-lg font-bold tracking-tight">
          INVENTARIO
        </h1>

        <div className="w-10" />
      </header>

      {/* Sidebar escritorio fijo */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={desktopCollapsed}
          mobileOpen={true}
          onClose={() => {}}
          onNavigate={() => {}}
        />

        <button
          onClick={() => setDesktopCollapsed((prev) => !prev)}
          className={`
            fixed top-6 z-[60] hidden -translate-y-0 rounded-xl border border-zinc-700
            bg-zinc-950 p-2 text-zinc-300 shadow-lg transition hover:bg-zinc-900 hover:text-white lg:flex
            ${desktopCollapsed ? 'left-[88px]' : 'left-[280px]'}
          `}
          aria-label={desktopCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {desktopCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>

      {/* Sidebar móvil */}
      <div className="lg:hidden">
        <Sidebar
          collapsed={false}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      {/* Contenido */}
      <main
        className={`
          min-h-[calc(100dvh-56px)] lg:min-h-screen
          ${desktopSidebarWidth}
        `}
      >
        <div
          className="
            mx-auto w-full max-w-7xl
            px-3 py-3
            sm:px-6 sm:py-6
            lg:px-8 lg:py-8
            pb-[max(1rem,env(safe-area-inset-bottom))]
            pl-[max(0.75rem,env(safe-area-inset-left))]
            pr-[max(0.75rem,env(safe-area-inset-right))]
          "
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
