import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
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
  Loader2,
  Pencil,
  Package,
  CalendarDays,
  Warehouse,
  ShieldCheck,
} from 'lucide-react';
import {
  subscribeInventoryById,
  saveInventoryDetail,
} from '../services/inventory';

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
    const obs =
      String(entry.observationType || 'Buen estado').trim() || 'Buen estado';
    summary[obs] = (summary[obs] || 0) + safeNumber(entry.quantity);
  }
  return summary;
}

function calculateDifference(expected, counted) {
  return safeNumber(counted) - safeNumber(expected);
}

function calculateStatus(item) {
  const obsSummary = summarizeEntriesByObservation(item.countEntries || []);
  const counted = safeNumber(item.countedQuantity);
  const expected = safeNumber(item.expectedQuantity);
  const unavailable = safeNumber(item.unavailableQuantity);

  if (counted <= 0) return 'FALTANTE';
  if ((obsSummary.Caducado || 0) > 0) return 'CADUCADO';
  if ((obsSummary.Dañado || 0) > 0 || (obsSummary.Maltratado || 0) > 0) {
    return 'DAÑADO';
  }
  if (unavailable > 0 || (obsSummary.Exhibición || 0) > 0) return 'ALERTA';
  if (expected <= 0) return 'FALTANTE';
  return 'OK';
}

function normalizeItem(item, index = 0) {
  const countEntries = Array.isArray(item.countEntries) ? item.countEntries : [];
  const countedQuantity = sumCountEntries(countEntries);
  const difference = calculateDifference(item.expectedQuantity, countedQuantity);
  const observationTotals = summarizeEntriesByObservation(countEntries);

  const normalized = {
    ...item,
    _localKey:
      item._localKey ||
      item.id ||
      `${item.productName || 'producto'}-${item.categoryCode || 'cat'}-${item.supplierCode || 'sup'}-${index}`,
    expectedQuantity: safeNumber(item.expectedQuantity),
    unavailableQuantity: safeNumber(item.unavailableQuantity),
    countedQuantity,
    total: countedQuantity,
    difference,
    observation: item.observation || '',
    countEntries,
    observationTotals,
  };

  normalized.status = calculateStatus(normalized);
  return normalized;
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
    case 'No disponible':
      return 'border-zinc-700 bg-zinc-950 text-zinc-300';
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

function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function InventoryDetailPage() {
  const { id } = useParams();
  const location = useLocation();
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

  const isEditRoute = location.pathname.endsWith('/editar');
  const todayDateKey = useMemo(() => getTodayDateKey(), []);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeInventoryById(id, (data) => {
      if (!data) {
        setInventory(null);
        setItems([]);
        setNotes('');
        setLoading(false);
        return;
      }

      const normalizedItems = Array.isArray(data.items)
        ? data.items.map((item, index) => normalizeItem(item, index))
        : [];

      setInventory(data);
      setItems(normalizedItems);
      setNotes(data.notes || '');

      setExpandedItems((prev) => {
        const next = { ...prev };

        normalizedItems.forEach((item, idx) => {
          if (typeof next[item._localKey] !== 'boolean') {
            next[item._localKey] = idx === 0;
          }
        });

        return next;
      });

      setLoading(false);
    });

    return () => unsubscribe?.();
  }, [id]);

  const canEdit = useMemo(() => {
    return isEditRoute && inventory?.dateKey === todayDateKey;
  }, [isEditRoute, inventory, todayDateKey]);

  const showEditButton = useMemo(() => {
    return !isEditRoute && inventory?.dateKey === todayDateKey;
  }, [isEditRoute, inventory, todayDateKey]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) => {
      return (
        item.productName?.toLowerCase().includes(term) ||
        item.categoryName?.toLowerCase().includes(term) ||
        item.supplierName?.toLowerCase().includes(term) ||
        item.status?.toLowerCase().includes(term) ||
        item.observation?.toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      ok: items.filter((it) => it.status === 'OK').length,
      alerta: items.filter((it) => it.status === 'ALERTA').length,
      faltante: items.filter((it) => it.status === 'FALTANTE').length,
      danado: items.filter((it) => it.status === 'DAÑADO').length,
      caducado: items.filter((it) => it.status === 'CADUCADO').length,
    };
  }, [items]);

  const updateItem = (localKey, updater) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item._localKey !== localKey) return item;

        const updated =
          typeof updater === 'function'
            ? updater(item)
            : { ...item, ...updater };

        return normalizeItem(updated);
      })
    );
  };

  const handleDraftChange = (localKey, field, value) => {
    setEntryDrafts((prev) => ({
      ...prev,
      [localKey]: {
        quantity: prev[localKey]?.quantity || '',
        comment: prev[localKey]?.comment || '',
        observationType: prev[localKey]?.observationType || 'Buen estado',
        [field]: value,
      },
    }));
  };

  const handleAddCountEntry = (localKey) => {
    const draft = entryDrafts[localKey] || {
      quantity: '',
      comment: '',
      observationType: 'Buen estado',
    };

    const qty = safeNumber(draft.quantity);
    const observationType = String(
      draft.observationType || 'Buen estado'
    ).trim();

    if (qty <= 0) {
      setError('La cantidad del conteo debe ser mayor a cero.');
      setSuccess('');
      return;
    }

    if (!OBSERVATION_OPTIONS.includes(observationType)) {
      setError('La observación seleccionada no es válida.');
      setSuccess('');
      return;
    }

    setError('');
    setSuccess('');

    updateItem(localKey, (item) => ({
      ...item,
      countEntries: [
        ...(item.countEntries || []),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          quantity: qty,
          comment: String(draft.comment || '').trim(),
          observationType,
          createdAt: formatNow(),
        },
      ],
    }));

    setEntryDrafts((prev) => ({
      ...prev,
      [localKey]: {
        quantity: '',
        comment: '',
        observationType: 'Buen estado',
      },
    }));
  };

  const handleDeleteCountEntry = (localKey, entryId) => {
    setError('');
    setSuccess('');

    updateItem(localKey, (item) => ({
      ...item,
      countEntries: (item.countEntries || []).filter(
        (entry) => entry.id !== entryId
      ),
    }));
  };

  const handleSave = async () => {
    if (!inventory?.id || saving) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const normalizedItems = items.map((it, index) => normalizeItem(it, index));

      await saveInventoryDetail(inventory.id, normalizedItems, notes);

      setInventory((prev) => ({
        ...prev,
        items: normalizedItems,
        notes,
      }));
      setItems(normalizedItems);
      setSuccess('Inventario actualizado correctamente.');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'No se pudo guardar el inventario.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-300">
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin" />
          Cargando inventario...
        </div>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
              className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
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
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Encabezado */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-3">
              <button
                onClick={() => navigate('/inventario-diario')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-zinc-200 transition hover:border-zinc-700"
                aria-label="Volver"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <p className="text-sm font-medium text-blue-400">
                  {canEdit ? 'Editar inventario' : 'Detalle de inventario'}
                </p>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  Conteo del inventario
                </h1>
              </div>
            </div>

            <p className="text-sm leading-7 text-zinc-400">
              {canEdit
                ? 'Puedes modificar los conteos y observaciones del inventario de hoy.'
                : showEditButton
                  ? 'Este inventario corresponde al día de hoy. Puedes entrar a editarlo.'
                  : 'Los inventarios de días anteriores se muestran solo en modo lectura.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? 'Guardando...' : 'Guardar inventario'}
              </button>
            )}

            {showEditButton && (
              <Link
                to={`/inventario/${inventory.id}/editar`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
              >
                <Pencil size={18} />
                Editar
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Mensajes */}
      {error && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Info general */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-blue-400">
              <CalendarDays size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-zinc-400">Fecha</p>
              <p className="mt-2 text-lg font-semibold text-white sm:text-xl">
                {inventory.date || 'Sin fecha'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-300">
              <ClipboardList size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-zinc-400">Semana</p>
              <p className="mt-2 text-lg font-semibold text-white sm:text-xl">
                {inventory.week || 'Sin semana'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-yellow-400">
              <Warehouse size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-zinc-400">Cedis</p>
              <p className="mt-2 text-lg font-semibold text-white sm:text-xl">
                {inventory.cedis || 'Sin cedis'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-emerald-400">
              <ShieldCheck size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-zinc-400">Estado</p>
              <p className="mt-2 text-lg font-semibold text-emerald-400 sm:text-xl">
                {inventory.status || 'Abierto'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resumen */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm text-zinc-400">Total</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {summary.total}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-4">
          <p className="text-sm text-emerald-400">OK</p>
          <p className="mt-1 text-2xl font-semibold text-white">{summary.ok}</p>
        </div>

        <div className="rounded-2xl border border-yellow-900/60 bg-yellow-950/40 p-4">
          <p className="text-sm text-yellow-400">Alerta</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {summary.alerta}
          </p>
        </div>

        <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4">
          <p className="text-sm text-red-400">Faltantes</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {summary.faltante}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-sm text-zinc-300">Dañados</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {summary.danado}
          </p>
        </div>

        <div className="rounded-2xl border border-orange-900/60 bg-orange-950/40 p-4">
          <p className="text-sm text-orange-400">Caducados</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {summary.caducado}
          </p>
        </div>
      </section>

      {/* Productos */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <ClipboardList size={20} className="text-blue-400" />
          <h2 className="text-2xl font-bold text-white">
            Productos del inventario
          </h2>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
          <Search size={18} className="shrink-0 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto, categoría, proveedor, estado u observación..."
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
              const localKey = item._localKey;
              const draft = entryDrafts[localKey] || {
                quantity: '',
                comment: '',
                observationType: 'Buen estado',
              };
              const isExpanded = !!expandedItems[localKey];
              const observationTotals = item.observationTotals || {};

              const stateTags = [];

              for (const opt of OBSERVATION_OPTIONS) {
                const qty = safeNumber(observationTotals[opt] || 0);
                if (qty > 0) {
                  stateTags.push({ label: opt, quantity: qty });
                }
              }

              if (stateTags.length === 0) {
                if (safeNumber(item.unavailableQuantity) > 0) {
                  stateTags.push({
                    label: 'No disponible',
                    quantity: safeNumber(item.unavailableQuantity),
                  });
                } else {
                  stateTags.push({
                    label: item.status || 'OK',
                    quantity: safeNumber(item.countedQuantity || 0),
                  });
                }
              }

              return (
                <div
                  key={localKey}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-black"
                >
                  {/* Cabecera */}
                  <button
                    onClick={() =>
                      setExpandedItems((prev) => ({
                        ...prev,
                        [localKey]: !prev[localKey],
                      }))
                    }
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-zinc-950"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-white">
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
                            key={`${localKey}-${tag.label}-${tag.quantity}`}
                            className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-medium ${getObservationBadgeColor(
                              tag.label
                            )}`}
                          >
                            {tag.label} ·{' '}
                            {safeNumber(tag.quantity).toLocaleString('es-MX')}
                          </span>
                        ))}

                        <span
                          className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-medium ${getStatusColor(
                            item.status
                          )}`}
                        >
                          Estado · {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-zinc-400" />
                      ) : (
                        <ChevronDown size={18} className="text-zinc-400" />
                      )}
                    </div>
                  </button>

                  {/* Desplegable */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 px-4 py-4">
                      {/* Resumen producto */}
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                          <span className="block text-xs text-zinc-500">
                            Stock esperado
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
                          <span
                            className={
                              item.difference < 0
                                ? 'text-red-300'
                                : item.difference > 0
                                  ? 'text-emerald-300'
                                  : 'text-zinc-200'
                            }
                          >
                            {item.difference.toLocaleString('es-MX')}
                          </span>
                        </div>
                      </div>

                      {/* Agregar conteo */}
                      {canEdit && (
                        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                          <p className="mb-3 text-sm font-semibold text-white">
                            Agregar conteo
                          </p>

                          <div className="grid gap-3 md:grid-cols-[140px_1fr_220px_auto]">
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              value={draft.quantity}
                              onChange={(e) =>
                                handleDraftChange(
                                  localKey,
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
                                  localKey,
                                  'comment',
                                  e.target.value
                                )
                              }
                              placeholder="Comentario"
                              className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-white outline-none transition focus:border-blue-500"
                            />

                            <select
                              value={draft.observationType}
                              onChange={(e) =>
                                handleDraftChange(
                                  localKey,
                                  'observationType',
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-white outline-none transition focus:border-blue-500"
                            >
                              {OBSERVATION_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleAddCountEntry(localKey)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
                            >
                              <Plus size={16} />
                              Agregar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Resumen observaciones */}
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold text-white">
                          Resumen por observación
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {OBSERVATION_OPTIONS.filter(
                            (opt) => (observationTotals[opt] || 0) > 0
                          ).length === 0 ? (
                            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 px-3 py-4 text-sm text-zinc-400">
                              Aún no hay observaciones registradas.
                            </div>
                          ) : (
                            OBSERVATION_OPTIONS.filter(
                              (opt) => (observationTotals[opt] || 0) > 0
                            ).map((opt) => (
                              <div
                                key={`${localKey}-${opt}`}
                                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3"
                              >
                                <span className="block text-xs text-zinc-500">
                                  {opt}
                                </span>
                                <span className="text-zinc-200">
                                  {(observationTotals[opt] || 0).toLocaleString(
                                    'es-MX'
                                  )}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Historial */}
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-white">
                          Historial de conteos
                        </p>

                        {!item.countEntries || item.countEntries.length === 0 ? (
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
                                  +{safeNumber(entry.quantity).toLocaleString('es-MX')}
                                </p>

                                <p className="mt-1 break-words text-sm text-zinc-400">
                                  {entry.comment || 'Sin comentario'}
                                </p>

                                <p className="mt-1 text-xs text-zinc-500">
                                  {entry.observationType || 'Buen estado'} ·{' '}
                                  {entry.createdAt || 'Sin fecha'}
                                </p>
                              </div>

                              {canEdit && (
                                <button
                                  onClick={() =>
                                    handleDeleteCountEntry(localKey, entry.id)
                                  }
                                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-red-900 bg-red-950/40 px-4 py-2 font-medium text-red-300 transition hover:bg-red-900/40"
                                >
                                  <Trash2 size={16} />
                                  Eliminar
                                </button>
                              )}
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

      {/* Notas generales */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
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
          readOnly={!canEdit}
        />

        {!canEdit && (
          <p className="mt-2 text-sm text-zinc-500">
            Las notas generales solo pueden editarse en el inventario del día.
          </p>
        )}
      </section>
    </div>
  );
}