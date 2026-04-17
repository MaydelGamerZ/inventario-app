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
    return desktopCollapsed
      ? DESKTOP_COLLAPSED_WIDTH
      : DESKTOP_EXPANDED_WIDTH;
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

  return (
    <div className="min-h-screen bg-black text-white">

      {/* HEADER MOBILE */}
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
          onClick={() => setMobileOpen(true)}
          className="
            flex h-10 w-10 items-center justify-center
            rounded-xl border border-white/10
            bg-zinc-900
          "
        >
          <Menu size={20} />
        </button>

        <p className="text-sm font-semibold truncate">
          Inventario
        </p>

        <div className="w-10" />
      </header>

      {/* SIDEBAR DESKTOP */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={desktopCollapsed}
          mobileOpen={false}
          onClose={() => {}}
          onNavigate={() => {}}
        />

        {/* BOTÓN COLAPSO */}
        <button
          onClick={() => setDesktopCollapsed((prev) => !prev)}
          style={desktopToggleStyle}
          className="
            fixed top-4 z-[60]
            hidden lg:flex
            h-10 w-10 items-center justify-center
            rounded-xl border border-white/10
            bg-zinc-900 text-zinc-300
            hover:bg-zinc-800 hover:text-white
            transition-all duration-300
          "
        >
          {desktopCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>

      {/* SIDEBAR MOBILE */}
      <div className="lg:hidden">
        <Sidebar
          collapsed={false}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      {/* MAIN (RESPONSIVE CORRECTO) */}
      <main
        style={desktopMainStyle}
        className="
          min-h-screen
          transition-all duration-300 ease-out
          lg:ml-0
        "
      >
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