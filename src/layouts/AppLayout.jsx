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
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);

      if (desktop) {
        setMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = useMemo(() => {
    return desktopCollapsed ? DESKTOP_COLLAPSED_WIDTH : DESKTOP_EXPANDED_WIDTH;
  }, [desktopCollapsed]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-black text-white">
      {/* HEADER MÓVIL */}
      <header
        className="
          fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between
          border-b border-white/10 bg-black/95 px-3 backdrop-blur
          pt-[env(safe-area-inset-top)]
          lg:hidden
        "
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="
            flex h-10 w-10 items-center justify-center rounded-xl
            border border-white/10 bg-zinc-900 text-white
            transition hover:bg-zinc-800 active:scale-[0.98]
          "
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <p className="truncate px-3 text-sm font-semibold tracking-wide text-white">
          Inventario
        </p>

        <div className="w-10 shrink-0" />
      </header>

      {/* SIDEBAR */}
      <Sidebar
        collapsed={desktopCollapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNavigate={() => setMobileOpen(false)}
      />

      {/* BOTÓN DESKTOP */}
      <button
        type="button"
        onClick={() => setDesktopCollapsed((prev) => !prev)}
        style={{ left: `${sidebarWidth - 18}px` }}
        className="
          fixed top-4 z-[70] hidden h-10 w-10 items-center justify-center
          rounded-xl border border-white/10 bg-zinc-900 text-white
          shadow-lg transition hover:bg-zinc-800 active:scale-[0.98]
          lg:flex
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

      {/* CONTENIDO */}
      <main
        className="min-h-screen min-h-[100dvh] transition-[margin] duration-300"
        style={{
          marginLeft: isDesktop ? `${sidebarWidth}px` : '0px',
        }}
      >
        <div
          className="
            mx-auto w-full max-w-screen-2xl
            px-3 pb-4
            pt-[calc(56px+env(safe-area-inset-top)+12px)]
            sm:px-4 sm:pb-5
            md:px-5
            lg:px-6 lg:py-6
            xl:px-8
          "
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
