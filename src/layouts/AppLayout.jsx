import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const DESKTOP_EXPANDED_WIDTH = 290;
const DESKTOP_COLLAPSED_WIDTH = 92;
const MOBILE_HEADER_HEIGHT = 64;

export default function AppLayout() {
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const desktopSidebarWidth = useMemo(() => {
    return desktopCollapsed
      ? DESKTOP_COLLAPSED_WIDTH
      : DESKTOP_EXPANDED_WIDTH;
  }, [desktopCollapsed]);

  const mainStyle = useMemo(() => {
    return {
      paddingLeft: 0,
    };
  }, []);

  const desktopMainStyle = useMemo(() => {
    return {
      paddingLeft: `${desktopSidebarWidth}px`,
    };
  }, [desktopSidebarWidth]);

  const desktopToggleStyle = useMemo(() => {
    return {
      left: `${desktopSidebarWidth - 16}px`,
    };
  }, [desktopSidebarWidth]);

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
    <div className="min-h-screen bg-black text-white">
      {/* Header móvil */}
      <header
        className="
          sticky top-0 z-40 lg:hidden
          border-b border-white/10
          bg-black/95 backdrop-blur-xl
          pt-[env(safe-area-inset-top)]
        "
      >
        <div
          className="
            flex items-center justify-between
            px-3
            pl-[max(0.75rem,env(safe-area-inset-left))]
            pr-[max(0.75rem,env(safe-area-inset-right))]
          "
          style={{ minHeight: `${MOBILE_HEADER_HEIGHT}px` }}
        >
          <button
            type="button"
            onClick={handleOpenMobileMenu}
            className="
              inline-flex h-11 w-11 items-center justify-center
              rounded-2xl border border-white/10
              bg-zinc-950 text-zinc-100
              shadow-[0_8px_30px_rgba(0,0,0,0.35)]
              transition
              hover:bg-zinc-900
              active:scale-[0.98]
            "
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1 px-3 text-center">
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
              Sistema de inventario
            </p>
            <h1 className="truncate text-base font-semibold tracking-tight text-white">
              Panel principal
            </h1>
          </div>

          <div className="h-11 w-11 shrink-0" />
        </div>
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
          style={desktopToggleStyle}
          className="
            fixed top-5 z-[70] hidden lg:inline-flex
            h-11 w-11 items-center justify-center
            rounded-2xl border border-white/10
            bg-zinc-950/95 text-zinc-300
            shadow-[0_12px_35px_rgba(0,0,0,0.45)]
            backdrop-blur
            transition
            hover:bg-zinc-900 hover:text-white
            active:scale-[0.98]
          "
          aria-label={desktopCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={desktopCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {desktopCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
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
        style={mainStyle}
        className="
          min-h-[calc(100dvh-64px-env(safe-area-inset-top))]
          lg:min-h-screen
          transition-all duration-300 ease-out
        "
      >
        <div style={desktopMainStyle} className="hidden lg:block" />

        <div
          className="
            mx-auto w-full max-w-screen-2xl
            px-3 py-3
            sm:px-5 sm:py-5
            lg:px-8 lg:py-8
            pb-[max(1rem,env(safe-area-inset-bottom))]
            pl-[max(0.75rem,env(safe-area-inset-left))]
            pr-[max(0.75rem,env(safe-area-inset-right))]
          "
        >
          <div
            className="
              w-full min-w-0
              rounded-[28px]
            "
          >
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}