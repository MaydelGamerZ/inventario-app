import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          <Menu size={22} />
        </button>

        <h1 className="text-base font-bold tracking-tight">INVENTARIO</h1>

        <div className="w-10" />
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] lg:min-h-screen">
        <aside
          className={`hidden border-r border-zinc-800 bg-zinc-950 transition-all duration-300 lg:block ${
            desktopCollapsed ? 'w-24' : 'w-80'
          }`}
        >
          <div className="flex h-full">
            <div className="flex-1 overflow-hidden">
              <Sidebar collapsed={desktopCollapsed} />
            </div>

            <div className="border-l border-zinc-800 p-2">
              <button
                onClick={() => setDesktopCollapsed(!desktopCollapsed)}
                className="mt-4 rounded-xl border border-zinc-700 p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
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

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />

            <aside className="fixed left-0 top-0 z-50 h-dvh w-[86%] max-w-[320px] bg-zinc-950 shadow-2xl lg:hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 text-white">
                <h2 className="text-xl font-bold">INVENTARIO</h2>

                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-zinc-700 p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="h-[calc(100dvh-73px)] overflow-y-auto">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
