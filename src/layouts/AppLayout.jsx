import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header móvil */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-800 bg-black px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <h1 className="max-w-[180px] truncate text-lg font-bold tracking-tight">
          INVENTARIO
        </h1>

        <div className="w-10" />
      </header>

      <div className="flex min-h-[calc(100vh-56px)] lg:min-h-screen">
        {/* Sidebar escritorio */}
        <aside
          className={`hidden border-r border-zinc-800 bg-zinc-950 transition-all duration-300 lg:block ${
            desktopCollapsed ? 'w-24' : 'w-80'
          }`}
        >
          <div className="flex h-screen">
            <div className="flex-1 overflow-hidden">
              <Sidebar collapsed={desktopCollapsed} />
            </div>

            <div className="border-l border-zinc-800 p-2">
              <button
                onClick={() => setDesktopCollapsed((prev) => !prev)}
                className="mt-4 rounded-xl border border-zinc-700 p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                aria-label="Colapsar menú"
              >
                {desktopCollapsed ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronLeft size={18} />
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Sidebar móvil */}
        <div
          className={`fixed inset-0 z-50 lg:hidden ${
            mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          <div
            onClick={() => setMobileOpen(false)}
            className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
              mobileOpen ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <aside
            className={`absolute left-0 top-0 h-dvh w-[84%] max-w-[320px] bg-zinc-950 shadow-2xl transition-transform duration-300 ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
              <h2 className="text-lg font-bold tracking-tight">INVENTARIO</h2>

              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-black text-zinc-200"
                aria-label="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>

            <div className="h-[calc(100dvh-73px)] overflow-y-auto">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>

        {/* Contenido */}
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
