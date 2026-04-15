import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Search,
  AlertTriangle,
  ClipboardList,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getInventoryById, saveInventoryDetail } from '../services/inventory';

const OBSERVATION_OPTIONS = [
  'Buen estado',
  'Dañado',
  'Caducado',
  'Exhibición',
  'Maltratado',
  'Otro',
];

function formatNow() {
  return new Date().toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sumCountEntries(entries = []) {
  return entries.reduce((sum, entry) => sum + safeNumber(entry.quantity), 0);
}

function summarizeEntriesByObservation(entries = []) {
  const summary = {};

  for (const entry of entries) {
    const observation =
      String(entry.observationType || 'Buen estado').trim() || 'Buen estado';
    summary[observation] =
      (summary[observation] || 0) + safeNumber(entry.quantity);
  }

  return summary;
}

function calculateDifference(expectedQuantity, countedQuantity) {
  return safeNumber(countedQuantity) - safeNumber(expectedQuantity);
}

function calculateStatus(item) {
  const observationSummary = summarizeEntriesByObservation(
    item.countEntries || []
  );
  const counted = safeNumber(item.countedQuantity);
  const expected = safeNumber(item.expectedQuantity);
  const unavailable = safeNumber(item.unavailableQuantity);

  if (counted <= 0) return 'FALTANTE';
  if ((observationSummary.Caducado || 0) > 0) return 'CADUCADO';
  if (
    (observationSummary.Dañado || 0) > 0 ||
    (observationSummary.Maltratado || 0) > 0
  ) {
    return 'DAÑADO';
  }
  if (unavailable > 0 || (observationSummary.Exhibición || 0) > 0)
    return 'ALERTA';
  if (expected <= 0) return 'FALTANTE';

  return 'OK';
}

function getStatusColor(status) {
  switch (status) {
    case 'OK':
      return 'border-emerald-900/60 bg-emerald-950/50 text-emerald-400';
    case 'ALERTA':
      return 'border-yellow-900/60 bg-yellow-950/50 text-yellow-400';
    case 'FALTANTE':
      return 'border-red-900/60 bg-red-950/50 text-red-400';
    case 'DAÑADO':
      return 'border-zinc-700 bg-zinc-900 text-zinc-300';
    case 'CADUCADO':
      return 'border-orange-900/60 bg-orange-950/50 text-orange-400';
    default:
      return 'border-zinc-800 bg-zinc-900 text-zinc-300';
  }
}

function getObservationBadgeColor(label) {
  switch (label) {
    case 'Buen estado':
      return 'border-emerald-900/60 bg-emerald-950/50 text-emerald-400';
    case 'Dañado':
      return 'border-zinc-700 bg-zinc-900 text-zinc-300';
    case 'Caducado':
      return 'border-orange-900/60 bg-orange-950/50 text-orange-400';
    case 'Exhibición':
      return 'border-yellow-900/60 bg-yellow-950/50 text-yellow-400';
    case 'Maltratado':
      return 'border-red-900/60 bg-red-950/50 text-red-400';
    case 'Otro':
      return 'border-blue-900/60 bg-blue-950/50 text-blue-400';
    default:
      return 'border-zinc-800 bg-zinc-900 text-zinc-300';
  }
}

function getProductStateTags(item) {
  const observationTotals = item.observationTotals || {};
  const tags = [];

  for (const option of OBSERVATION_OPTIONS) {
    const qty = safeNumber(observationTotals[option] || 0);
    if (qty > 0) {
      tags.push({
        label: option,
        quantity: qty,
      });
    }
  }

  if (tags.length === 0) {
    if (safeNumber(item.unavailableQuantity) > 0) {
      tags.push({
        label: 'No disponible',
        quantity: safeNumber(item.unavailableQuantity),
      });
    } else {
      tags.push({
        label: item.status || 'OK',
        quantity: safeNumber(item.countedQuantity || 0),
      });
    }
  }

  return tags;
}

function normalizeItem(item) {
  const countEntries = Array.isArray(item.countEntries)
    ? item.countEntries
    : [];
  const countedQuantity = sumCountEntries(countEntries);
  const difference = calculateDifference(
    item.expectedQuantity,
    countedQuantity
  );
  const observationTotals = summarizeEntriesByObservation(countEntries);

  const normalized = {
    ...item,
    expectedQuantity: safeNumber(item.expectedQuantity),
    unavailableQuantity: safeNumber(item.unavailableQuantity),
    countedQuantity,
    total: countedQuantity,
    difference,
    observation: item.observation || '',
    countEntries,
    observationTotals,
  };

  normalized.status = item.status || calculateStatus(normalized);

  return normalized;
}

export default function InventoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState(null);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [entryDrafts, setEntryDrafts] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadInventory() {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const inventoryData = await getInventoryById(id);

      if (!inventoryData) {
        setInventory(null);
        setItems([]);
        return;
      }

      const normalizedItems = Array.isArray(inventoryData.items)
        ? inventoryData.items.map(normalizeItem)
        : [];

      setInventory(inventoryData);
      setItems(normalizedItems);
      setNotes(inventoryData.notes || '');

      const initialExpanded = {};
      normalizedItems.forEach((_, index) => {
        initialExpanded[index] = index === 0;
      });
      setExpandedItems(initialExpanded);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, [id]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) => {
      return (
        item.productName?.toLowerCase().includes(term) ||
        item.categoryName?.toLowerCase().includes(term) ||
        item.supplierName?.toLowerCase().includes(term) ||
        item.status?.toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      ok: items.filter((item) => item.status === 'OK').length,
      alerta: items.filter((item) => item.status === 'ALERTA').length,
      faltante: items.filter((item) => item.status === 'FALTANTE').length,
      danado: items.filter((item) => item.status === 'DAÑADO').length,
      caducado: items.filter((item) => item.status === 'CADUCADO').length,
    };
  }, [items]);

  function updateItem(index, updater) {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const updated =
          typeof updater === 'function'
            ? updater(item)
            : { ...item, ...updater };
        return normalizeItem(updated);
      })
    );
  }

  const handleDraftChange = (index, field, value) => {
    setEntryDrafts((prev) => ({
      ...prev,
      [index]: {
        quantity: prev[index]?.quantity || '',
        comment: prev[index]?.comment || '',
        observationType: prev[index]?.observationType || 'Buen estado',
        [field]: value,
      },
    }));
  };

  const handleAddCountEntry = (index) => {
    const draft = entryDrafts[index] || {
      quantity: '',
      comment: '',
      observationType: 'Buen estado',
    };

    const quantity = safeNumber(draft.quantity);

    if (quantity <= 0) {
      setError('La cantidad del conteo debe ser mayor a cero.');
      return;
    }

    setError('');
    setSuccess('');

    updateItem(index, (item) => ({
      ...item,
      countEntries: [
        ...(item.countEntries || []),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          quantity,
          comment: String(draft.comment || '').trim(),
          observationType: String(draft.observationType || 'Buen estado'),
          createdAt: formatNow(),
        },
      ],
    }));

    setEntryDrafts((prev) => ({
      ...prev,
      [index]: {
        quantity: '',
        comment: '',
        observationType: 'Buen estado',
      },
    }));
  };

  const handleDeleteCountEntry = (itemIndex, entryId) => {
    setError('');
    setSuccess('');

    updateItem(itemIndex, (item) => ({
      ...item,
      countEntries: (item.countEntries || []).filter(
        (entry) => entry.id !== entryId
      ),
    }));
  };

  const toggleExpanded = (index) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleSave = async () => {
    if (!inventory?.id) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const normalizedItems = items.map((item) => normalizeItem(item));

      const savedInventory = await saveInventoryDetail(
        inventory.id,
        normalizedItems,
        notes
      );

      const refreshedItems = Array.isArray(savedInventory.items)
        ? savedInventory.items.map(normalizeItem)
        : [];

      setInventory(savedInventory);
      setItems(refreshedItems);
      setNotes(savedInventory.notes || '');
      setSuccess('Inventario actualizado correctamente.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo guardar el inventario.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-300">
        Cargando inventario...
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="space-y-4">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-2xl font-bold text-white">
            Inventario no encontrado
          </h1>
          <p className="mt-2 text-zinc-400">
            No existe un inventario con ese identificador.
          </p>

          <div className="mt-5">
            <Link
              to="/inventario-diario"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              <ArrowLeft size={18} />
              Volver
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <button
                onClick={() => navigate('/inventario-diario')}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-zinc-200 transition hover:border-zinc-700"
              >
                <ArrowLeft size={18} />
              </button>

              <div>
                <p className="text-sm font-medium text-blue-400">
                  Detalle de inventario
                </p>
                <h1 className="text-3xl font-bold text-white">
                  Conteo del inventario
                </h1>
              </div>
            </div>

            <p className="text-sm leading-7 text-zinc-400">
              Cada producto puede tener varios conteos y cada conteo se
              clasifica por observación.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar inventario'}
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">Fecha</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {inventory.date || 'Sin fecha'}
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">Semana</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {inventory.week || 'Sin semana'}
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">Cedis</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {inventory.cedis || 'Sin cedis'}
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">Estado</p>
          <p className="mt-2 text-xl font-semibold text-emerald-400">
            {inventory.status || 'Abierto'}
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm text-zinc-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.total}</p>
        </div>

        <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-4">
          <p className="text-sm text-emerald-400">OK</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.ok}</p>
        </div>

        <div className="rounded-2xl border border-yellow-900/60 bg-yellow-950/40 p-4">
          <p className="text-sm text-yellow-400">Alerta</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.alerta}</p>
        </div>

        <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4">
          <p className="text-sm text-red-400">Faltantes</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {summary.faltante}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-sm text-zinc-300">Dañados</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.danado}</p>
        </div>

        <div className="rounded-2xl border border-orange-900/60 bg-orange-950/40 p-4">
          <p className="text-sm text-orange-400">Caducados</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {summary.caducado}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4 flex items-center gap-3">
          <ClipboardList size={20} className="text-blue-400" />
          <h2 className="text-2xl font-bold text-white">
            Productos del inventario
          </h2>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
          <Search size={18} className="text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto, categoría, proveedor o estado..."
            className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
          />
        </div>

        <div className="mt-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
              No hay productos que coincidan con la búsqueda.
            </div>
          ) : (
            filteredItems.map((item) => {
              const realIndex = items.findIndex(
                (sourceItem) =>
                  sourceItem.productName === item.productName &&
                  sourceItem.categoryCode === item.categoryCode &&
                  sourceItem.supplierCode === item.supplierCode
              );

              const draft = entryDrafts[realIndex] || {
                quantity: '',
                comment: '',
                observationType: 'Buen estado',
              };

              const isExpanded = !!expandedItems[realIndex];
              const observationTotals = item.observationTotals || {};
              const stateTags = getProductStateTags(item);

              return (
                <div
                  key={`${item.productName}-${item.categoryCode}-${item.supplierCode}-${realIndex}`}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-black"
                >
                  <button
                    onClick={() => toggleExpanded(realIndex)}
                    className="flex w-full items-center justify-between px-4 py-4 text-left transition hover:bg-zinc-950"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {item.categoryName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.supplierName}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {stateTags.map((tag) => (
                          <span
                            key={`${tag.label}-${tag.quantity}`}
                            className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-medium ${getObservationBadgeColor(
                              tag.label
                            )}`}
                          >
                            {tag.label} ·{' '}
                            {safeNumber(tag.quantity).toLocaleString('es-MX')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="ml-4 flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-zinc-400" />
                      ) : (
                        <ChevronDown size={18} className="text-zinc-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-zinc-800 px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <span className="block text-xs text-zinc-500">
                            Stock
                          </span>
                          <span className="text-zinc-200">
                            {item.expectedQuantity.toLocaleString('es-MX')}
                          </span>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <span className="block text-xs text-zinc-500">
                            No disponible
                          </span>
                          <span className="text-zinc-200">
                            {item.unavailableQuantity.toLocaleString('es-MX')}
                          </span>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <span className="block text-xs text-zinc-500">
                            Contado acumulado
                          </span>
                          <span className="text-zinc-200">
                            {item.countedQuantity.toLocaleString('es-MX')}
                          </span>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <span className="block text-xs text-zinc-500">
                            Diferencia
                          </span>
                          <span className="text-zinc-200">
                            {item.difference.toLocaleString('es-MX')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                        <p className="mb-3 text-sm font-semibold text-white">
                          Agregar conteo
                        </p>

                        <div className="grid gap-3 md:grid-cols-[140px_1fr_220px_auto]">
                          <input
                            type="number"
                            value={draft.quantity}
                            onChange={(e) =>
                              handleDraftChange(
                                realIndex,
                                'quantity',
                                e.target.value
                              )
                            }
                            placeholder="Cantidad"
                            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-white outline-none transition focus:border-blue-500"
                          />

                          <input
                            type="text"
                            value={draft.comment}
                            onChange={(e) =>
                              handleDraftChange(
                                realIndex,
                                'comment',
                                e.target.value
                              )
                            }
                            placeholder="Comentario: tarima A, exhibición, pasillo..."
                            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-white outline-none transition focus:border-blue-500"
                          />

                          <select
                            value={draft.observationType}
                            onChange={(e) =>
                              handleDraftChange(
                                realIndex,
                                'observationType',
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-white outline-none transition focus:border-blue-500"
                          >
                            {OBSERVATION_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleAddCountEntry(realIndex)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
                          >
                            <Plus size={16} />
                            Agregar
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold text-white">
                          Resumen por observación
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {OBSERVATION_OPTIONS.filter(
                            (option) => (observationTotals[option] || 0) > 0
                          ).length === 0 ? (
                            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 px-3 py-4 text-sm text-zinc-400">
                              Aún no hay observaciones registradas.
                            </div>
                          ) : (
                            OBSERVATION_OPTIONS.filter(
                              (option) => (observationTotals[option] || 0) > 0
                            ).map((option) => (
                              <div
                                key={option}
                                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3"
                              >
                                <span className="block text-xs text-zinc-500">
                                  {option}
                                </span>
                                <span className="text-zinc-200">
                                  {(
                                    observationTotals[option] || 0
                                  ).toLocaleString('es-MX')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-white">
                          Historial de conteos
                        </p>

                        {!item.countEntries ||
                        item.countEntries.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 px-3 py-4 text-sm text-zinc-400">
                            Aún no hay conteos registrados para este producto.
                          </div>
                        ) : (
                          item.countEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-white">
                                  +
                                  {safeNumber(entry.quantity).toLocaleString(
                                    'es-MX'
                                  )}
                                </p>
                                <p className="mt-1 text-sm text-zinc-400">
                                  {entry.comment || 'Sin comentario'}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {entry.observationType || 'Buen estado'} ·{' '}
                                  {entry.createdAt || 'Sin fecha'}
                                </p>
                              </div>

                              <button
                                onClick={() =>
                                  handleDeleteCountEntry(realIndex, entry.id)
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-900 bg-red-950/40 px-4 py-2 font-medium text-red-300 transition hover:bg-red-900/40"
                              >
                                <Trash2 size={16} />
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

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Notas generales</h2>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Escribe aquí observaciones generales del inventario..."
          className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
        />
      </section>
    </div>
  );
}
