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

  const handleToggleDesktopSidebar = () => {
    setDesktopCollapsed((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HEADER MOBILE (más compacto) */}
      <header
        className="
          sticky top-0 z-40 lg:hidden
          flex items-center justify-between
          h-[56px]
          px-3
          border-b border-white/10
          bg-black/90 backdrop-blur
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

        <p className="text-sm font-semibold text-white truncate">Inventario</p>

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

        <button
          onClick={handleToggleDesktopSidebar}
          style={{ left: `${sidebarWidth - 18}px` }}
          className="
            fixed top-4 z-50
            h-10 w-10
            hidden lg:flex
            items-center justify-center
            rounded-xl border border-white/10
            bg-zinc-900
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
      <Sidebar
        collapsed={false}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNavigate={() => setMobileOpen(false)}
      />

      {/* MAIN */}
      <main
        style={{
          marginLeft: window.innerWidth >= 1024 ? `${sidebarWidth}px` : 0,
        }}
        className="
          min-h-screen
          transition-all duration-300
        "
      >
        <div
          className="
            w-full
            max-w-screen-xl
            mx-auto

            px-3
            py-3

            sm:px-4
            sm:py-4

            lg:px-6
            lg:py-6
          "
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
