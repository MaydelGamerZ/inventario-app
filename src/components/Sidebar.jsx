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
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DESKTOP_EXPANDED_WIDTH = 290;
const DESKTOP_COLLAPSED_WIDTH = 92;
const MOBILE_WIDTH = 312;

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
  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    if (mobileOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
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

  const asideWidth = collapsed
    ? DESKTOP_COLLAPSED_WIDTH
    : DESKTOP_EXPANDED_WIDTH;

  return (
    <>
      {/* Overlay móvil */}
      <div
        onClick={onClose}
        aria-hidden={!mobileOpen}
        className={[
          'fixed inset-0 z-40 bg-black/72 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          mobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      {/* Sidebar */}
      <aside
        aria-label="Barra lateral principal"
        style={{
          width: isDesktop ? `${asideWidth}px` : `min(${MOBILE_WIDTH}px, 88vw)`,
        }}
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-[100dvh] flex-col',
          'border-r border-white/10 bg-[#050505] text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)]',
          'pt-[env(safe-area-inset-top)] pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          'pl-[max(0px,env(safe-area-inset-left))] pr-0',
          'transition-transform duration-300 ease-out lg:transition-[width] lg:duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="border-b border-white/10 px-3 py-3 sm:px-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className={collapsed ? 'w-full text-center' : 'min-w-0 flex-1'}
            >
              <div
                className={[
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium',
                  'border-blue-500/25 bg-blue-500/10 text-blue-300',
                ].join(' ')}
              >
                <ShieldCheck size={13} />
                {collapsed ? 'INV' : 'Sistema activo'}
              </div>

              <h1
                className={[
                  'mt-3 font-semibold tracking-tight text-white',
                  collapsed ? 'text-lg' : 'text-3xl leading-none',
                ].join(' ')}
              >
                {collapsed ? 'INV' : 'INVENTARIO'}
              </h1>

              {!collapsed && (
                <p className="mt-2 text-sm text-zinc-400">Panel principal</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white lg:flex"
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
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
                aria-label="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 sm:px-3">
          <div className="space-y-1.5">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = isCurrentRoute(to);

              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={handleNavClick}
                  title={collapsed ? label : undefined}
                  className={() =>
                    [
                      'group flex items-center rounded-2xl transition-all duration-200',
                      'min-h-[54px] active:scale-[0.99]',
                      collapsed ? 'justify-center px-3' : 'gap-3 px-4 py-3',
                      active
                        ? 'bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.28)]'
                        : 'text-zinc-300 hover:bg-white/[0.045] hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon size={20} className="shrink-0" />

                  {!collapsed && (
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="truncate text-[15px] font-medium">
                        {label}
                      </span>

                      <ChevronRight
                        size={16}
                        className={[
                          'shrink-0 transition',
                          active
                            ? 'text-white'
                            : 'text-zinc-500 group-hover:text-zinc-300',
                        ].join(' ')}
                      />
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3 sm:p-4">
          {!collapsed ? (
            <>
              <div className="mb-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Usuario
                </p>

                <p className="mt-2 truncate text-lg font-semibold text-white">
                  {userName}
                </p>

                <p className="mt-1 break-all text-sm text-zinc-400">
                  {user?.email || 'usuario@correo.com'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={18} />
                {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <div
                className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-zinc-300"
                title={user?.email || userName}
              >
                <span className="text-xs font-semibold uppercase">
                  {userName.slice(0, 2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-red-600 px-3 py-3 text-white transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
