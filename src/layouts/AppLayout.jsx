import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const DESKTOP_EXPANDED_WIDTH = 290;
const DESKTOP_COLLAPSED_WIDTH = 92;

export default function AppLayout() {
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const desktopSidebarPaddingClass = useMemo(() => {
    return desktopCollapsed
      ? `lg:pl-[${DESKTOP_COLLAPSED_WIDTH}px]`
      : `lg:pl-[${DESKTOP_EXPANDED_WIDTH}px]`;
  }, [desktopCollapsed]);

  const desktopToggleLeftClass = useMemo(() => {
    return desktopCollapsed
      ? `left-[${DESKTOP_COLLAPSED_WIDTH}px]`
      : `left-[${DESKTOP_EXPANDED_WIDTH}px]`;
  }, [desktopCollapsed]);

  const handleOpenMobileMenu = () => {
    setMobileOpen(true);
  };

  const handleCloseMobileMenu = () => {
    setMobileOpen(false);
  };

  const handleToggleDesktopSidebar = () => {
    setDesktopCollapsed((prev) => !prev);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-black text-white">
      {/* Header móvil */}
      <header
        className="
          sticky top-0 z-40 flex min-h-[56px] items-center justify-between
          border-b border-zinc-800 bg-black/95 backdrop-blur lg:hidden
          px-4
          pt-[env(safe-area-inset-top)]
          pl-[max(1rem,env(safe-area-inset-left))]
          pr-[max(1rem,env(safe-area-inset-right))]
        "
      >
        <button
          type="button"
          onClick={handleOpenMobileMenu}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 transition hover:bg-zinc-900 hover:text-white active:scale-[0.98]"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <h1 className="max-w-[180px] truncate text-lg font-bold tracking-tight">
          INVENTARIO
        </h1>

        <div className="w-10" />
      </header>

      {/* Sidebar escritorio */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={desktopCollapsed}
          mobileOpen
          onClose={() => {}}
          onNavigate={() => {}}
          onToggleCollapse={handleToggleDesktopSidebar}
        />

        <button
          type="button"
          onClick={handleToggleDesktopSidebar}
          className={`
            fixed top-6 z-[60] hidden rounded-xl border border-zinc-700
            bg-zinc-950 p-2 text-zinc-300 shadow-lg transition
            hover:bg-zinc-900 hover:text-white active:scale-[0.98]
            lg:flex ${desktopToggleLeftClass}
          `}
          aria-label={desktopCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={desktopCollapsed ? 'Expandir menú' : 'Colapsar menú'}
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
          onClose={handleCloseMobileMenu}
          onNavigate={handleCloseMobileMenu}
        />
      </div>

      {/* Contenido */}
      <main
        className={`
          min-h-[calc(100dvh-56px)] lg:min-h-screen
          transition-[padding] duration-300 ease-out
          ${desktopSidebarPaddingClass}
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