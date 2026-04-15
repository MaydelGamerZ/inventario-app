import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getInventoryById,
  updateInventoryBasicData,
} from '../services/inventory';

function formatDate(dateString) {
  if (!dateString) return 'Sin fecha';
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function InventoryDetailPage() {
  const { inventoryId } = useParams();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState(null);
  const [form, setForm] = useState({
    semana: '',
    cedis: '',
    estado: 'abierto',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadInventory() {
    try {
      setLoading(true);
      setMessage('');

      const data = await getInventoryById(inventoryId);

      if (!data) {
        setInventory(null);
        setMessage('El inventario no existe.');
        return;
      }

      setInventory(data);
      setForm({
        semana: data.semana || '',
        cedis: data.cedis || '',
        estado: data.estado || 'abierto',
      });
    } catch (error) {
      console.error(error);
      setInventory(null);
      setMessage('Error al cargar el inventario.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, [inventoryId]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage('');

      await updateInventoryBasicData(inventoryId, {
        semana: form.semana.trim(),
        cedis: form.cedis.trim(),
        estado: form.estado,
      });

      await loadInventory();
      setMessage('Inventario actualizado correctamente.');
    } catch (error) {
      console.error(error);
      setMessage('No se pudo actualizar el inventario.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
        Cargando inventario...
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-zinc-300">{message}</p>
        <button
          onClick={() => navigate('/inventario-diario')}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 transition"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Detalle del Inventario</h2>
          <p className="mt-2 text-zinc-400">
            Aquí definiremos la base del inventario antes de cargar productos.
          </p>
        </div>

        <button
          onClick={() => navigate('/inventario-diario')}
          className="rounded-xl bg-zinc-800 px-5 py-3 font-semibold text-white hover:bg-zinc-700 transition"
        >
          Volver
        </button>
      </header>

      {message && (
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm text-zinc-200">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Fecha</p>
          <h3 className="mt-2 text-lg font-semibold">
            {formatDate(inventory.fecha)}
          </h3>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Estado</p>
          <h3 className="mt-2 text-lg font-semibold capitalize">
            {inventory.estado}
          </h3>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Total categorías</p>
          <h3 className="mt-2 text-lg font-semibold">
            {inventory.totalCategorias || 0}
          </h3>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Total productos</p>
          <h3 className="mt-2 text-lg font-semibold">
            {inventory.totalProductos || 0}
          </h3>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-bold">Datos básicos</h3>

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="semana"
                className="mb-2 block text-sm font-medium"
              >
                Semana
              </label>
              <input
                id="semana"
                name="semana"
                type="text"
                value={form.semana}
                onChange={handleChange}
                placeholder="Ej. 15"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="cedis" className="mb-2 block text-sm font-medium">
                Cedis
              </label>
              <input
                id="cedis"
                name="cedis"
                type="text"
                value={form.cedis}
                onChange={handleChange}
                placeholder="Ej. MEXICALI"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="estado"
                className="mb-2 block text-sm font-medium"
              >
                Estado
              </label>
              <select
                id="estado"
                name="estado"
                value={form.estado}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="abierto">abierto</option>
                <option value="cerrado">cerrado</option>
                <option value="archivado">archivado</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-bold">Resumen técnico</h3>

          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="text-zinc-400">ID del inventario</p>
              <p className="mt-1 break-all text-white">{inventory.id}</p>
            </div>

            <div>
              <p className="text-zinc-400">Origen</p>
              <p className="mt-1 text-white">{inventory.origen || 'manual'}</p>
            </div>

            <div>
              <p className="text-zinc-400">Creado por</p>
              <p className="mt-1 text-white">
                {inventory.creadoPor?.nombre ||
                  inventory.creadoPor?.email ||
                  'Sin dato'}
              </p>
            </div>

            <div>
              <p className="text-zinc-400">Fecha de creación</p>
              <p className="mt-1 text-white">
                {inventory.creadoEn || 'Sin dato'}
              </p>
            </div>

            <div>
              <p className="text-zinc-400">Última actualización</p>
              <p className="mt-1 text-white">
                {inventory.actualizadoEn || 'Sin dato'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
