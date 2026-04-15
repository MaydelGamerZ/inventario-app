import { NavLink } from 'react-router-dom';
import { logoutUser } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('No se pudo cerrar sesión.');
    }
  }

  const linkBase = 'block rounded-xl px-4 py-3 text-sm font-medium transition';
  const linkInactive = 'text-zinc-300 hover:bg-zinc-800 hover:text-white';
  const linkActive = 'bg-blue-600 text-white';

  return (
    <aside className="w-full md:w-72 bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">INVENTARIO</h1>
        <p className="text-sm text-zinc-400 mt-1">Panel principal</p>
      </div>

      <nav className="space-y-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
          }
        >
          Home
        </NavLink>

        <NavLink
          to="/inventario-diario"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
          }
        >
          Inventario Diario
        </NavLink>

        <button
          type="button"
          disabled
          className="w-full text-left rounded-xl px-4 py-3 text-sm font-medium text-zinc-500 bg-zinc-900 cursor-not-allowed"
        >
          Historial de Inventarios
        </button>

        <button
          type="button"
          disabled
          className="w-full text-left rounded-xl px-4 py-3 text-sm font-medium text-zinc-500 bg-zinc-900 cursor-not-allowed"
        >
          Productos / Categorías
        </button>
      </nav>

      <div className="mt-auto pt-6 border-t border-zinc-800">
        <div className="mb-4">
          <p className="text-sm font-semibold text-white truncate">
            {user?.displayName || 'Usuario'}
          </p>
          <p className="text-xs text-zinc-400 truncate">
            {user?.email || 'Sin correo'}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 transition"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
