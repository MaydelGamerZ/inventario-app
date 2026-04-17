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
  ChevronDown,
  ChevronUp,
  Filter,
  X,
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

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
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

function getCountEntries(item) {
  return Array.isArray(item?.countEntries) ? item.countEntries : [];
}

function getCountedQuantity(item) {
  const entries = getCountEntries(item);

  if (entries.length > 0) {
    return entries.reduce((sum, entry) => sum + safeNumber(entry?.quantity), 0);
  }

  return safeNumber(item?.countedQuantity);
}

function hasAnyCount(item) {
  return (
    getCountEntries(item).length > 0 || safeNumber(item?.countedQuantity) > 0
  );
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

  if (counted <= 0 && expected > 0) {
    tags.push({
      label: 'Faltante',
      quantity: expected,
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
    case 'mojado':
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
    case 'FALTANTE':
      return 'border-red-900/60 bg-red-950/50 text-red-400';
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

function sortItems(items = [], sortMode = 'counted-first') {
  const list = Array.isArray(items) ? [...items] : [];

  return list.sort((a, b) => {
    const aCounted = getCountedQuantity(a);
    const bCounted = getCountedQuantity(b);
    const aExpected = safeNumber(a?.expectedQuantity);
    const bExpected = safeNumber(b?.expectedQuantity);
    const aDiff = Math.abs(aCounted - aExpected);
    const bDiff = Math.abs(bCounted - bExpected);
    const aName = cleanText(a?.productName || '');
    const bName = cleanText(b?.productName || '');

    if (sortMode === 'name') {
      return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
    }

    if (sortMode === 'difference') {
      if (bDiff !== aDiff) return bDiff - aDiff;
      return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
    }

    const aHas = hasAnyCount(a) ? 1 : 0;
    const bHas = hasAnyCount(b) ? 1 : 0;

    if (bHas !== aHas) return bHas - aHas;
    if (bDiff !== aDiff) return bDiff - aDiff;

    return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
  });
}

function groupItemsByCategory(items = [], sortMode = 'counted-first') {
  const map = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const categoryName = cleanText(item?.categoryName) || 'Sin categoría';

    if (!map.has(categoryName)) {
      map.set(categoryName, {
        id: categoryName,
        name: categoryName,
        items: [],
      });
    }

    map.get(categoryName).items.push(item);
  }

  return Array.from(map.values())
    .map((group) => {
      const sortedItems = sortItems(group.items, sortMode);

      return {
        ...group,
        items: sortedItems,
        totalProducts: sortedItems.length,
        totalExpected: sortedItems.reduce(
          (sum, item) => sum + safeNumber(item?.expectedQuantity),
          0
        ),
        totalCounted: sortedItems.reduce(
          (sum, item) => sum + getCountedQuantity(item),
          0
        ),
      };
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
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
  const [sortMode, setSortMode] = useState('counted-first');
  const [showOnlyCounted, setShowOnlyCounted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

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
    const items = Array.isArray(inventory?.items) ? inventory.items : [];

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
      totalConteoFisico: items.reduce(
        (sum, item) => sum + getCountedQuantity(item),
        0
      ),
      totalCountedProducts: items.filter((item) => hasAnyCount(item)).length,
    };
  }, [inventory]);

  const filteredItems = useMemo(() => {
    const items = Array.isArray(inventory?.items) ? inventory.items : [];
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      if (showOnlyCounted && !hasAnyCount(item)) {
        return false;
      }

      if (!term) return true;

      const observationLabels = Object.keys(
        summarizeEntries(item?.countEntries || [])
      )
        .join(' ')
        .toLowerCase();

      const entriesText = getCountEntries(item)
        .map((entry) =>
          [
            entry?.observationType || '',
            entry?.comment || '',
            entry?.quantity ?? '',
            entry?.createdBy || '',
            entry?.createdByEmail || '',
          ]
            .join(' ')
            .toLowerCase()
        )
        .join(' ');

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
        observationLabels.includes(term) ||
        entriesText.includes(term) ||
        String(item?.expectedQuantity ?? '').includes(term) ||
        String(getCountedQuantity(item)).includes(term)
      );
    });
  }, [inventory, search, showOnlyCounted]);

  const groupedFilteredItems = useMemo(() => {
    return groupItemsByCategory(filteredItems, sortMode);
  }, [filteredItems, sortMode]);

  useEffect(() => {
    if (!groupedFilteredItems.length) {
      setExpandedCategories({});
      return;
    }

    setExpandedCategories((prev) => {
      const next = { ...prev };

      groupedFilteredItems.forEach((group) => {
        if (typeof next[group.id] === 'undefined') {
          next[group.id] = true;
        }
      });

      return next;
    });
  }, [groupedFilteredItems]);

  function getDraft(itemKey) {
    return drafts[itemKey] || buildInitialDraft();
  }

  function updateDraft(itemKey, patch) {
    setDrafts((prev) => ({
      ...prev,
      [itemKey]: {
        ...getDraft(itemKey),
        ...patch,
      },
    }));
  }

  function getRealItemIndex(item) {
    const items = Array.isArray(inventory?.items) ? inventory.items : [];
    return items.findIndex((candidate) => candidate === item);
  }

  async function handleAddEntry(item) {
    if (!inventory?.id) return;

    const itemIndex = getRealItemIndex(item);
    if (itemIndex < 0) {
      setActionError(
        'No se encontró el producto dentro del inventario actual.'
      );
      return;
    }

    const itemKey = `${inventory.id}-${itemIndex}`;
    const draft = getDraft(itemKey);
    const quantity = safeNumber(draft.quantity);

    setActionError('');
    setActionSuccess('');

    if (quantity <= 0) {
      setActionError('La cantidad debe ser mayor a 0.');
      return;
    }

    try {
      setBusyAdd((prev) => ({ ...prev, [itemKey]: true }));

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
        [itemKey]: buildInitialDraft(),
      }));

      setActionSuccess('Conteo agregado correctamente.');
    } catch (err) {
      console.error(err);
      setActionError(err?.message || 'No se pudo agregar el conteo.');
    } finally {
      setBusyAdd((prev) => ({ ...prev, [itemKey]: false }));
    }
  }

  async function handleDeleteEntry(item, entryId) {
    if (!inventory?.id || !entryId) return;

    const itemIndex = getRealItemIndex(item);
    if (itemIndex < 0) {
      setActionError(
        'No se encontró el producto dentro del inventario actual.'
      );
      return;
    }

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

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const expandAll = () => {
    const next = {};
    groupedFilteredItems.forEach((group) => {
      next[group.id] = true;
    });
    setExpandedCategories(next);
  };

  const collapseAll = () => {
    const next = {};
    groupedFilteredItems.forEach((group) => {
      next[group.id] = false;
    });
    setExpandedCategories(next);
  };

  const visibleProductsCount = groupedFilteredItems.reduce(
    (sum, group) => sum + group.items.length,
    0
  );

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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
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

              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">Productos contados</p>
                <p className="mt-2 font-semibold text-white">
                  {stats.totalCountedProducts}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">Conteo físico total</p>
                <p className="mt-2 font-semibold text-white">
                  {stats.totalConteoFisico.toLocaleString('es-MX')}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
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

              <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4">
                <p className="text-sm text-red-400">Faltantes</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {stats.faltante}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 lg:flex-1">
                  <Search size={18} className="shrink-0 text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar producto, categoría, proveedor, observación o cantidad..."
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="text-zinc-500 transition hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200">
                    <Filter size={16} />
                    <span>Solo contados</span>
                    <input
                      type="checkbox"
                      checked={showOnlyCounted}
                      onChange={(e) => setShowOnlyCounted(e.target.checked)}
                      className="h-4 w-4 accent-blue-600"
                    />
                  </label>

                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                    className="min-h-[44px] rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-white outline-none"
                  >
                    <option value="counted-first">
                      Ordenar: contados primero
                    </option>
                    <option value="difference">
                      Ordenar: mayor diferencia
                    </option>
                    <option value="name">Ordenar: nombre</option>
                  </select>

                  <button
                    type="button"
                    onClick={expandAll}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-900"
                  >
                    <ChevronDown size={16} />
                    Expandir todo
                  </button>

                  <button
                    type="button"
                    onClick={collapseAll}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-900"
                  >
                    <ChevronUp size={16} />
                    Contraer todo
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">Categorías visibles</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {groupedFilteredItems.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">Productos visibles</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {visibleProductsCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">Modo</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {isEditMode ? 'Edición' : 'Consulta'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {groupedFilteredItems.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
                  No hay productos que coincidan con la búsqueda.
                </div>
              ) : (
                groupedFilteredItems.map((group) => {
                  const isExpanded = expandedCategories[group.id] ?? true;

                  return (
                    <article
                      key={group.id}
                      className="overflow-hidden rounded-3xl border border-zinc-800 bg-black"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCategory(group.id)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-zinc-950 sm:px-5"
                      >
                        <div className="min-w-0">
                          <h3 className="break-words text-base font-bold text-blue-400 sm:text-lg">
                            {group.name}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-400">
                            {group.totalProducts} productos • Esperado:{' '}
                            {group.totalExpected.toLocaleString('es-MX')} •
                            Contado:{' '}
                            {group.totalCounted.toLocaleString('es-MX')}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-300">
                          {isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-zinc-800 px-4 py-4 sm:px-5">
                          <div className="space-y-4">
                            {group.items.map((item, index) => {
                              const realIndex = getRealItemIndex(item);
                              const itemKey = `${inventory.id}-${realIndex}-${cleanText(
                                item?.productName || index
                              )}`;
                              const counted = getCountedQuantity(item);
                              const expected = safeNumber(
                                item.expectedQuantity
                              );
                              const difference = counted - expected;
                              const tags = buildItemTags(item);
                              const draft = getDraft(itemKey);
                              const entries = getCountEntries(item);

                              return (
                                <div
                                  key={itemKey}
                                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                                >
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                      <p className="break-words font-semibold text-white">
                                        {item.productName ||
                                          'Producto sin nombre'}
                                      </p>

                                      <p className="mt-1 text-xs text-zinc-500">
                                        {item.supplierName || 'Sin proveedor'}
                                      </p>

                                      {tags.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {tags.map((tag, tagIndex) => (
                                            <span
                                              key={`${itemKey}-${tag.label}-${tagIndex}`}
                                              className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-medium ${getTagClasses(
                                                tag.label
                                              )}`}
                                            >
                                              {tag.label} ·{' '}
                                              {safeNumber(
                                                tag.quantity
                                              ).toLocaleString('es-MX')}
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
                                    <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2">
                                      <span className="block text-xs text-zinc-500">
                                        Stock esperado
                                      </span>
                                      <span className="text-zinc-200">
                                        {expected.toLocaleString('es-MX')}
                                      </span>
                                    </div>

                                    <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2">
                                      <span className="block text-xs text-zinc-500">
                                        No disponible
                                      </span>
                                      <span className="text-zinc-200">
                                        {safeNumber(
                                          item.unavailableQuantity
                                        ).toLocaleString('es-MX')}
                                      </span>
                                    </div>

                                    <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2">
                                      <span className="block text-xs text-zinc-500">
                                        Conteo físico
                                      </span>
                                      <span
                                        className={
                                          hasAnyCount(item)
                                            ? 'font-semibold text-white'
                                            : 'text-zinc-200'
                                        }
                                      >
                                        {counted.toLocaleString('es-MX')}
                                      </span>
                                    </div>

                                    <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2">
                                      <span className="block text-xs text-zinc-500">
                                        Sobra
                                      </span>
                                      <span className="text-emerald-300">
                                        {difference > 0
                                          ? difference.toLocaleString('es-MX')
                                          : '0'}
                                      </span>
                                    </div>

                                    <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2">
                                      <span className="block text-xs text-zinc-500">
                                        Falta
                                      </span>
                                      <span className="text-red-300">
                                        {difference < 0
                                          ? Math.abs(difference).toLocaleString(
                                              'es-MX'
                                            )
                                          : '0'}
                                      </span>
                                    </div>
                                  </div>

                                  {isEditMode && (
                                    <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-4">
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
                                              updateDraft(itemKey, {
                                                quantity: e.target.value,
                                              })
                                            }
                                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-blue-500"
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
                                              updateDraft(itemKey, {
                                                observationType: e.target.value,
                                              })
                                            }
                                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                                          >
                                            <option>Buen estado</option>
                                            <option>Caducado</option>
                                            <option>Dañado</option>
                                            <option>Maltratado</option>
                                            <option>Exhibición</option>
                                            <option>Mojado</option>
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
                                              updateDraft(itemKey, {
                                                comment: e.target.value,
                                              })
                                            }
                                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                                            placeholder="Opcional"
                                          />
                                        </div>
                                      </div>

                                      <div className="mt-3 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => handleAddEntry(item)}
                                          disabled={Boolean(busyAdd[itemKey])}
                                          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                                        >
                                          {busyAdd[itemKey] ? (
                                            <Loader2
                                              size={16}
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <Plus size={16} />
                                          )}
                                          {busyAdd[itemKey]
                                            ? 'Agregando...'
                                            : 'Agregar conteo'}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-4">
                                    <p className="mb-3 text-sm font-medium text-white">
                                      Conteos registrados
                                    </p>

                                    {entries.length === 0 ? (
                                      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-500">
                                        Aún no hay conteos para este producto.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {entries.map((entry) => (
                                          <div
                                            key={entry.id}
                                            className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 lg:flex-row lg:items-center lg:justify-between"
                                          >
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                  className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${getTagClasses(
                                                    entry?.observationType ||
                                                      'Buen estado'
                                                  )}`}
                                                >
                                                  {entry?.observationType ||
                                                    'Buen estado'}
                                                </span>

                                                <span className="text-sm font-semibold text-white">
                                                  {safeNumber(
                                                    entry.quantity
                                                  ).toLocaleString('es-MX')}
                                                </span>
                                              </div>

                                              <p className="mt-2 text-xs text-zinc-400">
                                                {entry.comment ||
                                                  'Sin comentario'}
                                              </p>

                                              <p className="mt-1 text-xs text-zinc-600">
                                                {entry.createdBy ||
                                                  entry.createdByEmail ||
                                                  'Sin usuario'}{' '}
                                                ·{' '}
                                                {entry.createdAt ||
                                                  entry.createdAtLabel ||
                                                  'Sin fecha'}
                                              </p>
                                            </div>

                                            {isEditMode && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleDeleteEntry(
                                                    item,
                                                    entry.id
                                                  )
                                                }
                                                disabled={Boolean(
                                                  busyDelete[entry.id]
                                                )}
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
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </article>
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
