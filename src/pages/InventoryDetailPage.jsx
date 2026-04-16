import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Boxes,
  ClipboardList,
  Download,
  Eye,
  Loader2,
  Package,
  Pencil,
  Save,
  Search,
  Trash2,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  addInventoryCountEntry,
  finalizeInventoryCount,
  removeInventoryCountEntry,
  subscribeInventoryById,
} from '../services/inventory';
import { exportInventoryToPDF } from '../services/pdfExporter';

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function summarizeEntries(entries = []) {
  const summary = {};

  for (const entry of Array.isArray(entries) ? entries : []) {
    const label =
      String(entry?.observationType || 'Buen estado').trim() || 'Buen estado';

    summary[label] = (summary[label] || 0) + safeNumber(entry?.quantity);
  }

  return summary;
}

function getCountedQuantity(item) {
  const entries = Array.isArray(item?.countEntries) ? item.countEntries : [];

  if (entries.length > 0) {
    return entries.reduce((sum, entry) => sum + safeNumber(entry?.quantity), 0);
  }

  return safeNumber(item?.countedQuantity);
}

function buildItemTags(item) {
  const tags = [];
  const observationTotals = summarizeEntries(item?.countEntries || []);
  const expected = safeNumber(item?.expectedQuantity);
  const counted = getCountedQuantity(item);
  const difference = counted - expected;

  Object.entries(observationTotals).forEach(([label, quantity]) => {
    if (safeNumber(quantity) > 0) {
      tags.push({
        label,
        quantity: safeNumber(quantity),
      });
    }
  });

  if (counted <= 0) {
    tags.push({
      label: 'Faltante',
      quantity: expected > 0 ? expected : 0,
    });
  }

  if (difference > 0) {
    tags.push({
      label: 'Sobrante',
      quantity: difference,
    });
  }

  if (difference < 0 && counted > 0) {
    tags.push({
      label: 'Faltante',
      quantity: Math.abs(difference),
    });
  }

  return tags;
}

function getTagClasses(label) {
  switch (String(label).toLowerCase()) {
    case 'buen estado':
      return 'border-emerald-900/60 bg-emerald-950/50 text-emerald-400';
    case 'caducado':
      return 'border-orange-900/60 bg-orange-950/50 text-orange-400';
    case 'dañado':
    case 'maltratado':
      return 'border-zinc-700 bg-zinc-900 text-zinc-300';
    case 'exhibición':
    case 'exhibicion':
      return 'border-yellow-900/60 bg-yellow-950/50 text-yellow-400';
    case 'faltante':
      return 'border-red-900/60 bg-red-950/50 text-red-400';
    case 'sobrante':
      return 'border-blue-900/60 bg-blue-950/50 text-blue-400';
    default:
      return 'border-zinc-800 bg-zinc-900 text-zinc-300';
  }
}

function getStatusClasses(status) {
  switch (String(status || '').toUpperCase()) {
    case 'OK':
      return 'border-emerald-900/60 bg-emerald-950/50 text-emerald-400';
    case 'ALERTA':
      return 'border-yellow-900/60 bg-yellow-950/50 text-yellow-400';
    case 'CADUCADO':
      return 'border-orange-900/60 bg-orange-950/50 text-orange-400';
    case 'DAÑADO':
      return 'border-zinc-700 bg-zinc-900 text-zinc-300';
    default:
      return 'border-red-900/60 bg-red-950/50 text-red-400';
  }
}

function cleanCedisDisplay(value) {
  const text = safeString(value);
  if (!text) return 'Sin cedis';

  const stopWords = [
    ' PRODUCTO',
    ' CANTIDAD',
    ' NO CONTEO',
    ' CONTEO FISICO',
    ' TOTAL',
    ' DIFERENCIA',
    ' OBSERVACIÓN',
    ' OBSERVACION',
  ];

  let cleaned = text;

  for (const word of stopWords) {
    const index = cleaned.indexOf(word);
    if (index > 0) {
      cleaned = cleaned.slice(0, index).trim();
    }
  }

  return cleaned || text;
}

function buildInitialDraft() {
  return {
    quantity: '',
    observationType: 'Buen estado',
    comment: '',
  };
}

export default function InventoryDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isEditMode = location.pathname.endsWith('/editar');

  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [savingFinal, setSavingFinal] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [drafts, setDrafts] = useState({});
  const [busyAdd, setBusyAdd] = useState({});
  const [busyDelete, setBusyDelete] = useState({});

  useEffect(() => {
    if (!id) {
      setError('No se recibió el identificador del inventario.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const unsubscribe = subscribeInventoryById(id, (doc) => {
      setInventory(doc || null);

      if (!doc) {
        setError('No se encontró el inventario solicitado.');
      } else {
        setError('');
      }

      setLoading(false);
    });

    return () => {
      unsubscribe?.();
    };
  }, [id]);

  const stats = useMemo(() => {
    const items = inventory?.items || [];

    return {
      totalProducts: items.length,
      totalCategories: inventory?.categories?.length || 0,
      ok: items.filter((i) => i.status === 'OK').length,
      alerta: items.filter((i) => i.status === 'ALERTA').length,
      faltante: items.filter((i) => i.status === 'FALTANTE').length,
      totalStockEsperado: items.reduce(
        (sum, item) => sum + safeNumber(item.expectedQuantity),
        0
      ),
      totalNoDisponible: items.reduce(
        (sum, item) => sum + safeNumber(item.unavailableQuantity),
        0
      ),
    };
  }, [inventory]);

  const filteredItems = useMemo(() => {
    const items = inventory?.items || [];
    const term = search.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) => {
      const observationLabels = Object.keys(
        summarizeEntries(item?.countEntries || [])
      )
        .join(' ')
        .toLowerCase();

      return (
        String(item?.productName || '')
          .toLowerCase()
          .includes(term) ||
        String(item?.categoryName || '')
          .toLowerCase()
          .includes(term) ||
        String(item?.supplierName || '')
          .toLowerCase()
          .includes(term) ||
        String(item?.status || '')
          .toLowerCase()
          .includes(term) ||
        observationLabels.includes(term)
      );
    });
  }, [inventory, search]);

  function getDraft(index) {
    return drafts[index] || buildInitialDraft();
  }

  function updateDraft(index, patch) {
    setDrafts((prev) => ({
      ...prev,
      [index]: {
        ...getDraft(index),
        ...patch,
      },
    }));
  }

  async function handleAddEntry(itemIndex) {
    if (!inventory?.id) return;

    const draft = getDraft(itemIndex);
    const quantity = safeNumber(draft.quantity);

    setActionError('');
    setActionSuccess('');

    if (quantity <= 0) {
      setActionError('La cantidad debe ser mayor a 0.');
      return;
    }

    try {
      setBusyAdd((prev) => ({ ...prev, [itemIndex]: true }));

      await addInventoryCountEntry(
        inventory.id,
        itemIndex,
        {
          quantity,
          observationType: draft.observationType || 'Buen estado',
          comment: draft.comment || '',
        },
        user?.email || ''
      );

      setDrafts((prev) => ({
        ...prev,
        [itemIndex]: buildInitialDraft(),
      }));

      setActionSuccess('Conteo agregado correctamente.');
    } catch (err) {
      console.error(err);
      setActionError(err?.message || 'No se pudo agregar el conteo.');
    } finally {
      setBusyAdd((prev) => ({ ...prev, [itemIndex]: false }));
    }
  }

  async function handleDeleteEntry(itemIndex, entryId) {
    if (!inventory?.id || !entryId) return;

    setActionError('');
    setActionSuccess('');

    try {
      setBusyDelete((prev) => ({ ...prev, [entryId]: true }));

      await removeInventoryCountEntry(inventory.id, itemIndex, entryId);
      setActionSuccess('Conteo eliminado correctamente.');
    } catch (err) {
      console.error(err);
      setActionError(err?.message || 'No se pudo eliminar el conteo.');
    } finally {
      setBusyDelete((prev) => ({ ...prev, [entryId]: false }));
    }
  }

  async function handleFinalize() {
    if (!inventory?.id) return;

    setActionError('');
    setActionSuccess('');

    try {
      setSavingFinal(true);

      await finalizeInventoryCount(
        inventory.id,
        inventory.items || [],
        inventory.notes || '',
        user?.email || ''
      );

      setActionSuccess('Inventario guardado de forma final.');
      navigate(`/inventario/${inventory.id}`);
    } catch (err) {
      console.error(err);
      setActionError(err?.message || 'No se pudo guardar el inventario.');
    } finally {
      setSavingFinal(false);
    }
  }

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/inventario-diario')}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-black px-4 py-2 text-sm font-medium text-white transition hover:border-zinc-500"
            >
              <ArrowLeft size={16} />
              Volver a inventario diario
            </button>

            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                {isEditMode ? 'Continuar conteo' : 'Detalle de inventario'}
              </h1>

              <p className="mt-2 text-sm leading-7 text-zinc-400 sm:text-base">
                {isEditMode
                  ? 'Aquí puedes capturar conteos, observaciones y guardar el inventario final.'
                  : 'Aquí puedes revisar el detalle completo del inventario seleccionado.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {inventory && !isEditMode && (
              <Link
                to={`/inventario/${inventory.id}/editar`}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
              >
                <Pencil size={18} />
                Ir a edición
              </Link>
            )}

            {inventory && isEditMode && (
              <Link
                to={`/inventario/${inventory.id}`}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-black px-4 py-3 font-medium text-white transition hover:border-zinc-500"
              >
                <Eye size={18} />
                Ver detalle
              </Link>
            )}

            {inventory?.status === 'GUARDADO' && (
              <button
                type="button"
                onClick={() => exportInventoryToPDF(inventory)}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500"
              >
                <Download size={18} />
                Descargar
              </button>
            )}

            {inventory && isEditMode && (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={savingFinal}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {savingFinal ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {savingFinal ? 'Guardando...' : 'Guardar final'}
              </button>
            )}
          </div>
        </div>
      </section>

      {loading && (
        <section className="rounded-2xl border border-zinc-800 bg-black px-4 py-8 text-zinc-400">
          <div className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Cargando inventario...
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-4 text-sm text-red-300">
          {error}
        </section>
      )}

      {!loading && actionError && (
        <section className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-4 text-sm text-red-300">
          {actionError}
        </section>
      )}

      {!loading && actionSuccess && (
        <section className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-4 text-sm text-emerald-300">
          {actionSuccess}
        </section>
      )}

      {!loading && inventory && (
        <>
          {isEditMode && (
            <section className="rounded-2xl border border-blue-900/60 bg-blue-950/30 px-4 py-4 text-sm text-blue-200">
              Ya estás dentro de la ruta correcta de edición. Aquí sí puedes
              contar.
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-blue-400">
                  <CalendarDays size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-zinc-400">Fecha</p>
                  <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                    {inventory.date || 'Sin fecha'}
                  </h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-emerald-400">
                  <ClipboardList size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-zinc-400">Estado</p>
                  <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                    {inventory.status || 'Sin estado'}
                  </h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-yellow-400">
                  <Boxes size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-zinc-400">Categorías</p>
                  <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                    {stats.totalCategories}
                  </h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-300">
                  <Package size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-zinc-400">Productos</p>
                  <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                    {stats.totalProducts}
                  </h2>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">Semana</p>
                <p className="mt-2 font-semibold text-white">
                  {inventory.week || 'Sin semana'}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-4 sm:col-span-2 xl:col-span-2">
                <p className="text-sm text-zinc-400">Cedis</p>
                <p className="mt-2 break-words font-semibold text-white">
                  {cleanCedisDisplay(inventory.cedis)}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">Stock esperado</p>
                <p className="mt-2 font-semibold text-white">
                  {stats.totalStockEsperado.toLocaleString('es-MX')}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">No disponible</p>
                <p className="mt-2 font-semibold text-white">
                  {stats.totalNoDisponible.toLocaleString('es-MX')}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-4">
                <p className="text-sm text-emerald-400">OK</p>
                <p className="mt-2 text-2xl font-bold text-white">{stats.ok}</p>
              </div>

              <div className="rounded-2xl border border-yellow-900/60 bg-yellow-950/40 p-4">
                <p className="text-sm text-yellow-400">Alerta</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {stats.alerta}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-red-900/60 bg-red-950/40 p-4">
              <p className="text-sm text-red-400">Faltantes</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {stats.faltante}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
              <Search size={18} className="shrink-0 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto, categoría, proveedor u observación..."
                className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
              />
            </div>

            <div className="mt-4 space-y-4">
              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
                  No hay productos que coincidan con la búsqueda.
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const counted = getCountedQuantity(item);
                  const expected = safeNumber(item.expectedQuantity);
                  const difference = counted - expected;
                  const tags = buildItemTags(item);
                  const draft = getDraft(index);
                  const entries = Array.isArray(item?.countEntries)
                    ? item.countEntries
                    : [];

                  return (
                    <div
                      key={`${item.productName || 'producto'}-${index}`}
                      className="rounded-2xl border border-zinc-800 bg-black p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-white">
                            {item.productName || 'Producto sin nombre'}
                          </p>

                          <p className="mt-1 text-sm text-zinc-400">
                            {item.categoryName || 'Sin categoría'}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {item.supplierName || 'Sin proveedor'}
                          </p>

                          {tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {tags.map((tag, tagIndex) => (
                                <span
                                  key={`${item.productName}-${tag.label}-${tagIndex}`}
                                  className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-medium ${getTagClasses(
                                    tag.label
                                  )}`}
                                >
                                  {tag.label} ·{' '}
                                  {safeNumber(tag.quantity).toLocaleString(
                                    'es-MX'
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <span
                          className={`inline-flex w-fit items-center rounded-xl border px-3 py-1 text-sm font-medium ${getStatusClasses(
                            item.status
                          )}`}
                        >
                          {item.status || 'SIN ESTADO'}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <span className="block text-xs text-zinc-500">
                            Stock esperado
                          </span>
                          <span className="text-zinc-200">
                            {expected.toLocaleString('es-MX')}
                          </span>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <span className="block text-xs text-zinc-500">
                            No disponible
                          </span>
                          <span className="text-zinc-200">
                            {safeNumber(
                              item.unavailableQuantity
                            ).toLocaleString('es-MX')}
                          </span>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <span className="block text-xs text-zinc-500">
                            Conteo físico
                          </span>
                          <span className="text-zinc-200">
                            {counted.toLocaleString('es-MX')}
                          </span>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <span className="block text-xs text-zinc-500">
                            Sobra
                          </span>
                          <span className="text-emerald-300">
                            {difference > 0
                              ? difference.toLocaleString('es-MX')
                              : '0'}
                          </span>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <span className="block text-xs text-zinc-500">
                            Falta
                          </span>
                          <span className="text-red-300">
                            {difference < 0
                              ? Math.abs(difference).toLocaleString('es-MX')
                              : '0'}
                          </span>
                        </div>
                      </div>

                      {isEditMode && (
                        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                          <p className="mb-3 text-sm font-medium text-white">
                            Agregar conteo
                          </p>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <label className="mb-1 block text-xs text-zinc-500">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={draft.quantity}
                                onChange={(e) =>
                                  updateDraft(index, {
                                    quantity: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-blue-500"
                                placeholder="Ej. 20"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-zinc-500">
                                Observación
                              </label>
                              <select
                                value={draft.observationType}
                                onChange={(e) =>
                                  updateDraft(index, {
                                    observationType: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-blue-500"
                              >
                                <option>Buen estado</option>
                                <option>Caducado</option>
                                <option>Dañado</option>
                                <option>Maltratado</option>
                                <option>Exhibición</option>
                              </select>
                            </div>

                            <div className="md:col-span-2 xl:col-span-2">
                              <label className="mb-1 block text-xs text-zinc-500">
                                Comentario
                              </label>
                              <input
                                type="text"
                                value={draft.comment}
                                onChange={(e) =>
                                  updateDraft(index, {
                                    comment: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-blue-500"
                                placeholder="Opcional"
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleAddEntry(index)}
                              disabled={Boolean(busyAdd[index])}
                              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                            >
                              {busyAdd[index] ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Plus size={16} />
                              )}
                              {busyAdd[index]
                                ? 'Agregando...'
                                : 'Agregar conteo'}
                            </button>
                          </div>

                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-white">
                              Conteos registrados
                            </p>

                            {entries.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-zinc-700 bg-black px-3 py-3 text-sm text-zinc-500">
                                Aún no hay conteos para este producto.
                              </div>
                            ) : (
                              entries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-black px-3 py-3 lg:flex-row lg:items-center lg:justify-between"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-white">
                                      {safeNumber(
                                        entry.quantity
                                      ).toLocaleString('es-MX')}{' '}
                                      · {entry.observationType || 'Buen estado'}
                                    </p>

                                    <p className="text-xs text-zinc-500">
                                      {entry.comment || 'Sin comentario'}
                                    </p>

                                    <p className="text-xs text-zinc-600">
                                      {entry.createdBy || 'Sin usuario'} ·{' '}
                                      {entry.createdAt || 'Sin fecha'}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteEntry(index, entry.id)
                                    }
                                    disabled={Boolean(busyDelete[entry.id])}
                                    className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/60 disabled:opacity-60"
                                  >
                                    {busyDelete[entry.id] ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                    Eliminar
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
