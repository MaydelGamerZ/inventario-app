import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, CalendarDays, User, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createTodayInventory,
  getAllInventories,
  getInventoryByDate,
} from '../services/inventory';

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function InventoryDayPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => formatDateLabel(today), [today]);
  const todayDateKey = useMemo(() => getTodayDateKey(), []);

  const [todayInventory, setTodayInventory] = useState(null);
  const [inventories, setInventories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const [todayInventoryData, inventoriesData] = await Promise.all([
        getInventoryByDate(todayDateKey),
        getAllInventories(),
      ]);

      setTodayInventory(todayInventoryData);
      setInventories(inventoriesData);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información del inventario.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [todayDateKey]);

  const handleCreateTodayInventory = async () => {
    try {
      setCreating(true);
      setError('');
      setSuccess('');

      const inventory = await createTodayInventory({
        date: todayLabel,
        dateKey: todayDateKey,
        status: 'Abierto',
        cedis: '',
        week: '',
        createdBy: user?.displayName || '',
        userEmail: user?.email || '',
      });

      setTodayInventory(inventory);
      setSuccess('Inventario del día creado correctamente.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo crear el inventario del día.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Inventario Diario
            </h1>
            <p className="mt-2 text-sm leading-7 text-zinc-400 sm:text-base">
              Aquí se crea y administra el inventario base de cada día.
            </p>
          </div>

          <button
            onClick={handleCreateTodayInventory}
            disabled={creating || Boolean(todayInventory)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusCircle size={18} />
            {todayInventory
              ? 'Inventario de hoy ya creado'
              : creating
                ? 'Creando...'
                : 'Crear inventario del día'}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-blue-400">
              <CalendarDays size={22} />
            </div>

            <div>
              <p className="text-sm text-zinc-400">Fecha actual</p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {todayLabel}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-emerald-400">
              <ClipboardList size={22} />
            </div>

            <div>
              <p className="text-sm text-zinc-400">Inventario de hoy</p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {loading
                  ? 'Cargando...'
                  : todayInventory
                    ? 'Creado'
                    : 'Pendiente'}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-300">
              <User size={22} />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-zinc-400">Usuario actual</p>
              <h2 className="mt-2 break-all text-2xl font-bold text-white">
                {user?.email || 'Sin usuario'}
              </h2>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">
            Inventario activo del día
          </h2>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
            Cargando inventario...
          </div>
        ) : !todayInventory ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-black px-4 py-6 text-zinc-400">
            Aún no existe un inventario para hoy.
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-800 bg-black p-5">
            <div className="grid gap-4 lg:grid-cols-4">
              <div>
                <p className="text-sm text-zinc-400">Fecha</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {todayInventory.date || 'Sin fecha'}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-400">Estado</p>
                <p className="mt-2 text-xl font-semibold text-emerald-400">
                  {todayInventory.status || 'Abierto'}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-400">Cedis</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {todayInventory.cedis || 'Sin definir'}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-400">Semana</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {todayInventory.week || 'Sin definir'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Link
                to={`/inventario/${todayInventory.id}`}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
              >
                Abrir inventario del día
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">
            Historial de inventarios
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Más adelante aquí veremos el historial completo, filtros y reportes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-4 text-sm font-semibold text-zinc-300">
                  Fecha
                </th>
                <th className="px-4 py-4 text-sm font-semibold text-zinc-300">
                  Estado
                </th>
                <th className="px-4 py-4 text-sm font-semibold text-zinc-300">
                  Cedis
                </th>
                <th className="px-4 py-4 text-sm font-semibold text-zinc-300">
                  Semana
                </th>
                <th className="px-4 py-4 text-sm font-semibold text-zinc-300">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-sm text-zinc-400">
                    Cargando inventarios...
                  </td>
                </tr>
              ) : inventories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-sm text-zinc-400">
                    No hay inventarios registrados.
                  </td>
                </tr>
              ) : (
                inventories.map((inventory) => (
                  <tr
                    key={inventory.id}
                    className="border-b border-zinc-900 last:border-b-0"
                  >
                    <td className="px-4 py-4 text-white">
                      {inventory.date || 'Sin fecha'}
                    </td>
                    <td className="px-4 py-4 text-white">
                      {inventory.status || 'Sin estado'}
                    </td>
                    <td className="px-4 py-4 text-white">
                      {inventory.cedis || 'Sin cedis'}
                    </td>
                    <td className="px-4 py-4 text-white">
                      {inventory.week || 'Sin semana'}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/inventario/${inventory.id}`}
                        className="font-medium text-blue-400 transition hover:text-blue-300"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
