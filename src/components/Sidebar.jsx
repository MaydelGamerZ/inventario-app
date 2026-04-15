import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, History, Boxes, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/inventario-diario', label: 'Inventario Diario', icon: ClipboardList },
  { to: '/historial', label: 'Historial de Inventarios', icon: History },
  { to: '/productos', label: 'Productos / Categorías', icon: Boxes },
];

export default function Sidebar({ collapsed = false, onNavigate = () => {} }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      onNavigate();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <aside className="flex h-full w-full flex-col bg-zinc-950 text-white">
      <div className="border-b border-zinc-800 px-4 py-6">
        <h1
          className={`font-bold tracking-tight ${
            collapsed ? 'text-center text-lg' : 'text-3xl'
          }`}
        >
          {collapsed ? 'INV' : 'INVENTARIO'}
        </h1>

        {!collapsed && (
          <p className="mt-2 text-sm text-zinc-400">Panel principal</p>
        )}
      </div>

      <nav className="flex-1 space-y-2 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'group flex items-center rounded-2xl transition-all duration-200',
                collapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white',
              ].join(' ')
            }
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        {!collapsed ? (
          <>
            <div className="mb-4">
              <p className="text-sm font-semibold">Usuario</p>
              <p className="break-all text-sm text-zinc-400">
                {user?.email || 'usuario@correo.com'}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </>
        ) : (
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-2xl bg-red-600 px-3 py-3 text-white transition hover:bg-red-500 active:scale-[0.98]"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
