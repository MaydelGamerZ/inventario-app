// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, History, Boxes, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/inventario-diario', label: 'Inventario Diario', icon: ClipboardList },
  { to: '/historial', label: 'Historial de Inventarios', icon: History },
  { to: '/productos', label: 'Productos / Categorías', icon: Boxes },
];

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onNavigate = () => {},
  onClose = () => {},
}) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      onNavigate();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
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
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
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
          'transition-transform duration-300 ease-out',
          collapsed ? 'w-[88px]' : 'w-[280px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="border-b border-zinc-800 px-4 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className={collapsed ? 'w-full text-center' : 'min-w-0'}>
              <h1
                className={`font-bold tracking-tight ${
                  collapsed ? 'text-lg' : 'text-2xl xl:text-3xl'
                }`}
              >
                {collapsed ? 'INV' : 'INVENTARIO'}
              </h1>

              {!collapsed && (
                <p className="mt-1 text-sm text-zinc-400">Panel principal</p>
              )}
            </div>

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

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  [
                    'group flex min-h-[52px] items-center rounded-2xl transition-all duration-200',
                    'active:scale-[0.99]',
                    collapsed ? 'justify-center px-3' : 'gap-3 px-4 py-3',
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white',
                  ].join(' ')
                }
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && (
                  <span className="truncate text-sm font-medium">{label}</span>
                )}
              </NavLink>
            ))}
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
                <p className="mt-1 break-all text-sm text-zinc-300">
                  {user?.email || 'usuario@correo.com'}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]"
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-red-600 px-3 py-3 text-white transition hover:bg-red-500 active:scale-[0.98]"
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
