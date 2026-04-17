// src/components/Sidebar.jsx
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  History,
  Boxes,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/inventario-diario', label: 'Inventario Diario', icon: ClipboardList },
  { to: '/historial', label: 'Historial de Inventarios', icon: History },
  { to: '/productos', label: 'Productos / Categorías', icon: Boxes },
];

function getUserName(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario';
}

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onNavigate = () => {},
  onClose = () => {},
  onToggleCollapse = () => {},
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loggingOut, setLoggingOut] = useState(false);

  const userName = useMemo(() => getUserName(user), [user]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (mobileOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [mobileOpen]);

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await logout();
      onClose();
      onNavigate();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleNavClick = () => {
    onClose();
    onNavigate();
  };

  const isCurrentRoute = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <>
      {/* Overlay móvil */}
      <div
        onClick={onClose}
        aria-hidden={!mobileOpen}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          mobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-[100dvh] flex-col overflow-hidden',
          'border-r border-zinc-800 bg-zinc-950 text-white shadow-2xl',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          'pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]',
          'transition-[width,transform] duration-300 ease-out',
          collapsed ? 'w-[92px]' : 'w-[290px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        ].join(' ')}
        aria-label="Barra lateral principal"
      >
        {/* Header */}
        <div className="border-b border-zinc-800 px-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className={collapsed ? 'w-full text-center' : 'min-w-0'}>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/60 bg-blue-950/30 px-3 py-1 text-[11px] font-medium text-blue-300">
                <ShieldCheck size={13} />
                {collapsed ? 'INV' : 'Sistema activo'}
              </div>

              <h1
                className={`mt-3 font-bold tracking-tight ${
                  collapsed ? 'text-lg' : 'text-2xl xl:text-3xl'
                }`}
              >
                {collapsed ? 'INV' : 'INVENTARIO'}
              </h1>

              {!collapsed && (
                <p className="mt-1 text-sm text-zinc-400">Panel principal</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-white lg:flex"
                aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              >
                {collapsed ? (
                  <PanelLeftOpen size={18} />
                ) : (
                  <PanelLeftClose size={18} />
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-white lg:hidden"
                aria-label="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = isCurrentRoute(to);

              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={handleNavClick}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    [
                      'group flex min-h-[52px] items-center rounded-2xl transition-all duration-200',
                      'active:scale-[0.99]',
                      collapsed ? 'justify-center px-3' : 'gap-3 px-4 py-3',
                      isActive || active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon size={20} className="shrink-0" />

                  {!collapsed && (
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">
                        {label}
                      </span>
                      <ChevronRight
                        size={16}
                        className={`shrink-0 transition ${
                          active
                            ? 'text-white'
                            : 'text-zinc-500 group-hover:text-white'
                        }`}
                      />
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-4">
          {!collapsed ? (
            <>
              <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Usuario
                </p>
                <p className="mt-1 truncate text-sm font-medium text-white">
                  {userName}
                </p>
                <p className="mt-1 break-all text-sm text-zinc-400">
                  {user?.email || 'usuario@correo.com'}
                </p>
              </div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? (
                  <>
                    <ChevronLeft size={18} className="opacity-0" />
                    Cerrando sesión...
                  </>
                ) : (
                  <>
                    <LogOut size={18} />
                    Cerrar sesión
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <div
                className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-zinc-300"
                title={user?.email || userName}
              >
                <span className="text-xs font-semibold uppercase">
                  {userName.slice(0, 2)}
                </span>
              </div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-red-600 px-3 py-3 text-white transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                {loggingOut ? (
                  <ChevronRight size={18} className="animate-pulse" />
                ) : (
                  <LogOut size={18} />
                )}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
