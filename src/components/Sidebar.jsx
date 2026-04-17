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
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const DESKTOP_EXPANDED_WIDTH = 290;
const DESKTOP_COLLAPSED_WIDTH = 92;

const navItems = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/inventario-diario', label: 'Inventario Diario', icon: ClipboardList },
  { to: '/historial', label: 'Historial de Inventarios', icon: History },
  { to: '/productos', label: 'Productos / Categorías', icon: Boxes },
];

function getUserName(user) {
  const displayName = user?.displayName?.trim();
  const emailName = user?.email?.split('@')?.[0]?.trim();

  if (displayName) return displayName;
  if (emailName) return emailName;

  return 'Usuario';
}

function getUserInitials(name) {
  if (!name) return 'US';

  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function isRouteActive(currentPath, to) {
  if (to === '/') return currentPath === '/';
  return currentPath === to || currentPath.startsWith(`${to}/`);
}

function SidebarHeader({ collapsed = false, mobile = false, onClose = null }) {
  return (
    <div className="border-b border-white/10 px-3 py-4">
      <div
        className={
          mobile
            ? 'flex items-start justify-between gap-3'
            : collapsed
              ? 'text-center'
              : 'min-w-0'
        }
      >
        <div className={mobile ? 'min-w-0 flex-1' : ''}>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-300">
            <ShieldCheck size={13} />
            {collapsed && !mobile ? 'INV' : 'Sistema activo'}
          </div>

          <h1
            className={[
              'mt-3 font-semibold tracking-tight text-white',
              collapsed && !mobile ? 'text-lg' : 'text-2xl leading-none',
            ].join(' ')}
          >
            {collapsed && !mobile ? 'INV' : 'INVENTARIO'}
          </h1>

          {(!collapsed || mobile) && (
            <p className="mt-2 text-sm text-zinc-400">Panel principal</p>
          )}
        </div>

        {mobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white active:scale-[0.98]"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

function SidebarNav({ collapsed = false, currentPath, onItemClick }) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-4 sm:px-3">
      <div className="space-y-1.5">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = isRouteActive(currentPath, to);

          return (
            <NavLink
              key={to}
              to={to}
              onClick={onItemClick}
              title={collapsed ? label : undefined}
              className={() =>
                [
                  'group flex rounded-2xl transition-all duration-200',
                  'min-h-[54px] items-center active:scale-[0.99]',
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
  );
}

function SidebarUserSection({
  collapsed = false,
  user,
  userName,
  loggingOut,
  onLogout,
}) {
  const initials = getUserInitials(userName);

  if (collapsed) {
    return (
      <div className="space-y-2">
        <div
          className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-zinc-300"
          title={user?.email || userName}
          aria-label={`Usuario ${userName}`}
        >
          <span className="text-xs font-semibold uppercase">{initials}</span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-red-600 px-3 py-3 text-white transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
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
        onClick={onLogout}
        disabled={loggingOut}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut size={18} />
        {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>
    </>
  );
}

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onNavigate = () => {},
  onClose = () => {},
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loggingOut, setLoggingOut] = useState(false);

  const userName = useMemo(() => getUserName(user), [user]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    if (!mobileOpen) return undefined;

    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen || typeof window === 'undefined') return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onClose]);

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

  return (
    <>
      {/* Overlay móvil */}
      <div
        onClick={onClose}
        aria-hidden={!mobileOpen}
        className={[
          'fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          mobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      {/* Sidebar escritorio */}
      <aside
        aria-label="Barra lateral principal"
        className={[
          'fixed inset-y-0 left-0 z-50 hidden flex-col lg:flex',
          'border-r border-white/10 bg-[#050505] text-white',
          'shadow-[0_20px_60px_rgba(0,0,0,0.55)]',
          'pt-[env(safe-area-inset-top)] pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          'transition-[width] duration-300 ease-out',
        ].join(' ')}
        style={{
          width: collapsed
            ? `${DESKTOP_COLLAPSED_WIDTH}px`
            : `${DESKTOP_EXPANDED_WIDTH}px`,
        }}
      >
        <SidebarHeader collapsed={collapsed} />

        <SidebarNav
          collapsed={collapsed}
          currentPath={location.pathname}
          onItemClick={handleNavClick}
        />

        <div className="border-t border-white/10 p-3 sm:p-4">
          <SidebarUserSection
            collapsed={collapsed}
            user={user}
            userName={userName}
            loggingOut={loggingOut}
            onLogout={handleLogout}
          />
        </div>
      </aside>

      {/* Sidebar móvil */}
      <aside
        aria-label="Barra lateral móvil"
        aria-hidden={!mobileOpen}
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[min(312px,88vw)] max-w-full flex-col lg:hidden',
          'border-r border-white/10 bg-[#050505] text-white',
          'shadow-[0_20px_60px_rgba(0,0,0,0.55)]',
          'pt-[env(safe-area-inset-top)] pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          'transition-transform duration-300 ease-out will-change-transform',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <SidebarHeader mobile onClose={onClose} />

        <SidebarNav
          currentPath={location.pathname}
          onItemClick={handleNavClick}
        />

        <div className="border-t border-white/10 p-3 sm:p-4">
          <SidebarUserSection
            user={user}
            userName={userName}
            loggingOut={loggingOut}
            onLogout={handleLogout}
          />
        </div>
      </aside>
    </>
  );
}
