import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createTodayInventory,
  getAllInventories,
  getInventoryByDate,
} from '../services/inventory';

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return 'Sin fecha';
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function InventoryDayPage() {
  const { user } = useAuth();

  const [todayInventory, setTodayInventory] = useState(null);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setMessage('');

      const today = getTodayDateString();

      const [inventoryToday, allInventories] = await Promise.all([
        getInventoryByDate(today),
        getAllInventories(),
      ]);

      setTodayInventory(inventoryToday);
      setInventories(allInventories);
    } catch (error) {
      console.error(error);
      setMessage('Error al cargar inventarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateTodayInventory() {
    try {
      setCreating(true);
      setMessage('');

      const created = await createTodayInventory(user);

      setTodayInventory(created);
      await loadData();

      setMessage('Inventario del día creado correctamente.');
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'No se pudo crear el inventario.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Inventario Diario</h2>
          <p className="mt-2 text-zinc-400">
            Aquí se crea y administra el inventario base de cada día.
          </p>
        </div>

        <button
          onClick={handleCreateTodayInventory}
          disabled={creating || !!todayInventory}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {todayInventory
            ? 'Inventario de hoy ya creado'
            : creating
              ? 'Creando...'
              : 'Crear inventario del día'}
        </button>
      </header>

      {message && (
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm text-zinc-200">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Fecha actual</p>
          <h3 className="mt-2 text-lg font-semibold">
            {formatDate(getTodayDateString())}
          </h3>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Inventario de hoy</p>
          <h3 className="mt-2 text-lg font-semibold">
            {todayInventory ? 'Creado' : 'Pendiente'}
          </h3>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Usuario actual</p>
          <h3 className="mt-2 text-lg font-semibold">
            {user?.displayName || user?.email || 'Usuario'}
          </h3>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-4">
          <h3 className="text-2xl font-bold">Inventario activo del día</h3>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
            Cargando...
          </div>
        ) : todayInventory ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-zinc-400">Fecha</p>
                <p className="mt-1 font-semibold">
                  {formatDate(todayInventory.fecha)}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-400">Estado</p>
                <p className="mt-1 font-semibold text-green-400">
                  {todayInventory.estado}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-400">Cedis</p>
                <p className="mt-1 font-semibold">
                  {todayInventory.cedis || 'Sin definir'}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-400">Semana</p>
                <p className="mt-1 font-semibold">
                  {todayInventory.semana || 'Sin definir'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to={`/inventario/${todayInventory.id}`}
                className="inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
              >
                Abrir inventario del día
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-6 text-zinc-400">
            Aún no existe un inventario para hoy.
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-2xl font-bold">Historial de inventarios</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Más adelante aquí veremos el historial completo, filtros y reportes.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="grid grid-cols-5 gap-4 border-b border-zinc-800 px-4 py-4 text-sm font-semibold text-zinc-400">
            <div>Fecha</div>
            <div>Estado</div>
            <div>Cedis</div>
            <div>Semana</div>
            <div>Acción</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-zinc-400">
              Cargando inventarios...
            </div>
          ) : inventories.length === 0 ? (
            <div className="px-4 py-6 text-zinc-400">
              No hay inventarios registrados.
            </div>
          ) : (
            inventories.map((inventory) => (
              <div
                key={inventory.id}
                className="grid grid-cols-5 gap-4 border-b border-zinc-800 px-4 py-4 text-sm text-white last:border-b-0"
              >
                <div>{formatDate(inventory.fecha)}</div>
                <div className="capitalize">
                  {inventory.estado || 'Sin estado'}
                </div>
                <div>{inventory.cedis || 'Sin cedis'}</div>
                <div>{inventory.semana || 'Sin semana'}</div>
                <div>
                  <Link
                    to={`/inventario/${inventory.id}`}
                    className="font-semibold text-blue-400 hover:text-blue-300"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
