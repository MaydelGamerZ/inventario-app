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

  const sidebarWidth = useMemo(() => {
    return desktopCollapsed ? DESKTOP_COLLAPSED_WIDTH : DESKTOP_EXPANDED_WIDTH;
  }, [desktopCollapsed]);

  const desktopMainStyle = useMemo(() => {
    return {
      marginLeft: `${sidebarWidth}px`,
    };
  }, [sidebarWidth]);

  const desktopToggleStyle = useMemo(() => {
    return {
      left: `${sidebarWidth - 18}px`,
    };
  }, [sidebarWidth]);

  const handleToggleDesktopSidebar = () => {
    setDesktopCollapsed((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header mobile */}
      <header
        className="
          sticky top-0 z-40 lg:hidden
          flex items-center justify-between
          h-[56px]
          border-b border-white/10
          bg-black/90 px-3 backdrop-blur
          pt-[env(safe-area-inset-top)]
        "
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="
            flex h-10 w-10 items-center justify-center
            rounded-xl border border-white/10
            bg-zinc-900 text-white
            active:scale-[0.98]
          "
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <p className="truncate text-sm font-semibold text-white">Inventario</p>

        <div className="w-10 shrink-0" />
      </header>

      {/* Sidebar desktop */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={desktopCollapsed}
          mobileOpen={false}
          onClose={() => {}}
          onNavigate={() => {}}
        />

        <button
          type="button"
          onClick={handleToggleDesktopSidebar}
          style={desktopToggleStyle}
          className="
            fixed top-4 z-[60]
            hidden h-10 w-10 lg:flex
            items-center justify-center
            rounded-xl border border-white/10
            bg-zinc-900 text-zinc-300
            transition-all duration-300 ease-out
            hover:bg-zinc-800 hover:text-white
            active:scale-[0.98]
          "
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

      {/* Sidebar mobile: OJO, solo mobile */}
      <div className="lg:hidden">
        <Sidebar
          collapsed={false}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      {/* Main */}
      <main className="min-h-screen transition-all duration-300 ease-out">
        <div style={desktopMainStyle} className="hidden lg:block" />

        <div
          className="
            mx-auto w-full max-w-screen-xl
            px-3 py-3
            sm:px-4 sm:py-4
            lg:px-6 lg:py-6
            pb-[max(1rem,env(safe-area-inset-bottom))]
          "
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}