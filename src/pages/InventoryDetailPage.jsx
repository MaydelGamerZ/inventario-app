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
  X,
  Hash,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  addInventoryCountEntry,
  finalizeInventoryCount,
  reopenInventoryDraft,
  removeInventoryCountEntry,
  subscribeInventoryById,
} from '../services/inventory';
import CustomSelect from '../components/CustomSelect';
import InventoryControlsMenu from '../components/InventoryControlsMenu';
import { exportInventoryToPDF } from '../services/pdfExporter';

function safeNumber(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
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

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabelFromKey(dateKey) {
  if (!dateKey) return 'Sin fecha';

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(
    year || new Date().getFullYear(),
    (month || 1) - 1,
    day || 1
  );

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getInventoryDateLabel(inventory) {
  return (
    cleanText(inventory?.dateLabel) ||
    cleanText(inventory?.date) ||
    formatDateLabelFromKey(cleanText(inventory?.dateKey)) ||
    'Sin fecha'
  );
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
      return 'border-emerald-900/60 bg-emerald-950/40 text-emerald-300';
    case 'caducado':
      return 'border-orange-900/60 bg-orange-950/40 text-orange-300';
    case 'dañado':
    case 'danado':
    case 'maltratado':
    case 'mojado':
      return 'border-zinc-700 bg-zinc-900 text-zinc-300';
    case 'exhibición':
    case 'exhibicion':
      return 'border-yellow-900/60 bg-yellow-950/40 text-yellow-300';
    case 'faltante':
      return 'border-red-900/60 bg-red-950/40 text-red-300';
    case 'sobrante':
      return 'border-blue-900/60 bg-blue-950/40 text-blue-300';
    default:
      return 'border-white/10 bg-white/[0.03] text-zinc-300';
  }
}

function getStatusClasses(status) {
  switch (String(status || '').toUpperCase()) {
    case 'OK':
      return 'border-emerald-900/60 bg-emerald-950/40 text-emerald-300';
    case 'ALERTA':
      return 'border-yellow-900/60 bg-yellow-950/40 text-yellow-300';
    case 'CADUCADO':
      return 'border-orange-900/60 bg-orange-950/40 text-orange-300';
    case 'DAÑADO':
      return 'border-zinc-700 bg-zinc-900 text-zinc-300';
    case 'FALTANTE':
      return 'border-red-900/60 bg-red-950/40 text-red-300';
    default:
      return 'border-white/10 bg-white/[0.03] text-zinc-300';
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
    const categoryName =
      cleanText(item?.categoryRaw) ||
      cleanText(item?.categoryName) ||
      'Sin categoría';

    const groupId = [
      cleanText(item?.supplierCode),
      cleanText(item?.categoryCode),
      categoryName,
    ].join('::');

    if (!map.has(groupId)) {
      map.set(groupId, {
        id: groupId,
        name: categoryName,
        items: [],
      });
    }

    map.get(groupId).items.push(item);
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
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

function StatCard({ icon: Icon, title, value, iconClassName = 'text-zinc-300' }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#050505] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.03] ${iconClassName}`}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-400">{title}</p>
          <h2 className="mt-2 break-words text-lg font-semibold text-white sm:text-2xl">
            {value}
          </h2>
        </div>
      </div>
    </div>
  );
}

const SORT_MODE_OPTIONS = [
  { value: 'counted-first', label: 'Ordenar: contados primero' },
  { value: 'difference', label: 'Ordenar: mayor diferencia' },
  { value: 'name', label: 'Ordenar: nombre' },
];

const OBSERVATION_OPTIONS = [
  { value: 'Buen estado', label: 'Buen estado' },
  { value: 'Caducado', label: 'Caducado' },
  { value: 'Dañado', label: 'Dañado' },
  { value: 'Maltratado', label: 'Maltratado' },
  { value: 'Exhibición', label: 'Exhibición' },
  { value: 'Mojado', label: 'Mojado' },
];

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
  const [reopeningCount, setReopeningCount] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [drafts, setDrafts] = useState({});
  const [busyAdd, setBusyAdd] = useState({});
  const [busyDelete, setBusyDelete] = useState({});
  const [sortMode, setSortMode] = useState('counted-first');
  const [showOnlyCounted, setShowOnlyCounted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const backTo =
    location.state?.from === 'history' ? '/historial' : '/inventario-diario';
  const todayDateKey = useMemo(() => getTodayDateKey(), []);

  const backLabel =
    location.state?.from === 'history'
      ? 'Volver a historial de inventarios'
      : 'Volver a inventario diario';

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
    const grouped = groupItemsByCategory(items);

    return {
      totalProducts: items.length,
      totalCategories: inventory?.categories?.length || grouped.length || 0,
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
        String(item?.productName || '').toLowerCase().includes(term) ||
        String(item?.categoryName || '').toLowerCase().includes(term) ||
        String(item?.categoryRaw || '').toLowerCase().includes(term) ||
        String(item?.supplierName || '').toLowerCase().includes(term) ||
        String(item?.status || '').toLowerCase().includes(term) ||
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

  const canReopenTodayInventory =
    !isEditMode &&
    inventory?.status === 'GUARDADO' &&
    cleanText(inventory?.dateKey) === todayDateKey;

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
      setActionError('No se encontró el producto dentro del inventario actual.');
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
      setActionError('No se encontró el producto dentro del inventario actual.');
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
      navigate(`/inventario/${inventory.id}`, {
        state: location.state || {},
      });
    } catch (err) {
      console.error(err);
      setActionError(err?.message || 'No se pudo guardar el inventario.');
    } finally {
      setSavingFinal(false);
    }
  }

  async function handleReopenCount() {
    if (!inventory?.id || !canReopenTodayInventory) return;

    setActionError('');
    setActionSuccess('');

    try {
      setReopeningCount(true);

      await reopenInventoryDraft(inventory.id);
      navigate(`/inventario/${inventory.id}/editar`, {
        state: location.state || {},
      });
    } catch (err) {
      console.error(err);
      setActionError(err?.message || 'No se pudo reingresar al conteo.');
    } finally {
      setReopeningCount(false);
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
      <section className="rounded-[28px] border border-white/10 bg-[#050505] p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.06]"
            >
              <ArrowLeft size={16} />
              {backLabel}
            </button>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {isEditMode ? 'Continuar conteo' : 'Detalle de inventario'}
              </h1>

              <p className="mt-2 text-sm leading-6 text-zinc-400 sm:text-base">
                {isEditMode
                  ? 'Aquí puedes capturar conteos, observaciones y guardar el inventario final.'
                  : 'Aquí puedes revisar el detalle completo del inventario seleccionado.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {inventory && !isEditMode && inventory.status !== 'GUARDADO' && (
              <Link
                to={`/inventario/${inventory.id}/editar`}
                state={location.state || {}}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <Pencil size={18} />
                Ir a edición
              </Link>
            )}

            {inventory && isEditMode && (
              <Link
                to={`/inventario/${inventory.id}`}
                state={location.state || {}}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
              >
                <Eye size={18} />
                Ver detalle
              </Link>
            )}

            {canReopenTodayInventory && (
              <button
                type="button"
                onClick={handleReopenCount}
                disabled={reopeningCount}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reopeningCount ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Pencil size={18} />
                )}
                {reopeningCount ? 'Reabriendo...' : 'Reingresar al conteo'}
              </button>
            )}

            {inventory?.status === 'GUARDADO' && (
              <button
                type="button"
                onClick={() => exportInventoryToPDF(inventory)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
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
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
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
        <section className="rounded-2xl border border-white/10 bg-black px-4 py-8 text-zinc-400">
          <div className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Cargando inventario...
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-4 text-sm text-red-200">
          {error}
        </section>
      )}

      {!loading && actionError && (
        <section className="rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-4 text-sm text-red-200">
          {actionError}
        </section>
      )}

      {!loading && actionSuccess && (
        <section className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-4 text-sm text-emerald-200">
          {actionSuccess}
        </section>
      )}

      {!loading && inventory && (
        <>
          {isEditMode && (
            <section className="rounded-2xl border border-blue-900/60 bg-blue-950/20 px-4 py-4 text-sm text-blue-200">
              Ya estás en modo edición. Aquí sí puedes registrar conteos.
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={CalendarDays}
              title="Fecha"
              value={getInventoryDateLabel(inventory)}
              iconClassName="text-blue-400"
            />
            <StatCard
              icon={ClipboardList}
              title="Estado"
              value={inventory.status || 'Sin estado'}
              iconClassName="text-emerald-400"
            />
            <StatCard
              icon={Boxes}
              title="Categorías"
              value={stats.totalCategories}
              iconClassName="text-yellow-400"
            />
            <StatCard
              icon={Package}
              title="Productos"
              value={stats.totalProducts}
              iconClassName="text-zinc-300"
            />
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#050505] p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Hash size={16} />
                  <p className="text-sm">Semana</p>
                </div>
                <p className="mt-2 font-semibold text-white">
                  {inventory.week || 'Sin semana'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black p-4 sm:col-span-2 xl:col-span-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Building2 size={16} />
                  <p className="text-sm">CEDIS</p>
                </div>
                <p className="mt-2 break-words font-semibold text-white">
                  {cleanCedisDisplay(inventory.cedis)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <p className="text-sm text-zinc-400">Stock esperado</p>
                <p className="mt-2 font-semibold text-white">
                  {stats.totalStockEsperado.toLocaleString('es-MX')}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <p className="text-sm text-zinc-400">No disponible</p>
                <p className="mt-2 font-semibold text-white">
                  {stats.totalNoDisponible.toLocaleString('es-MX')}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <p className="text-sm text-zinc-400">Productos contados</p>
                <p className="mt-2 font-semibold text-white">
                  {stats.totalCountedProducts}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <p className="text-sm text-zinc-400">Conteo físico total</p>
                <p className="mt-2 font-semibold text-white">
                  {stats.totalConteoFisico.toLocaleString('es-MX')}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4">
                <p className="text-sm text-emerald-300">OK</p>
                <p className="mt-2 text-2xl font-semibold text-white">{stats.ok}</p>
              </div>

              <div className="rounded-2xl border border-yellow-900/60 bg-yellow-950/30 p-4">
                <p className="text-sm text-yellow-300">Alerta</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {stats.alerta}
                </p>
              </div>

              <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-4">
                <p className="text-sm text-red-300">Faltantes</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {stats.faltante}
                </p>
              </div>
            </div>

            <div className="sticky top-[calc(56px+env(safe-area-inset-top)+12px)] z-20 mt-4 rounded-[26px] border border-white/10 bg-black/95 p-4 backdrop-blur lg:top-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 xl:flex-1">
                  <Search size={18} className="shrink-0 text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar producto, categoría, proveedor, observación o cantidad..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
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

                <InventoryControlsMenu
                  sortMode={sortMode}
                  onSortChange={setSortMode}
                  sortOptions={SORT_MODE_OPTIONS}
                  showOnlyCounted={showOnlyCounted}
                  onToggleShowOnlyCounted={setShowOnlyCounted}
                  onExpandAll={expandAll}
                  onCollapseAll={collapseAll}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-zinc-400">Categorías visibles</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {groupedFilteredItems.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-zinc-400">Productos visibles</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {visibleProductsCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-zinc-400">Modo</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {isEditMode ? 'Edición' : 'Consulta'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {groupedFilteredItems.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black px-4 py-6 text-zinc-400">
                  No hay productos que coincidan con la búsqueda.
                </div>
              ) : (
                groupedFilteredItems.map((group) => {
                  const isExpanded = expandedCategories[group.id] ?? true;

                  return (
                    <article
                      key={group.id}
                      className="overflow-hidden rounded-[28px] border border-white/10 bg-black"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCategory(group.id)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-white/[0.03] sm:px-5"
                      >
                        <div className="min-w-0">
                          <h3 className="break-words text-base font-semibold text-blue-400 sm:text-lg">
                            {group.name}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-400">
                            {group.totalProducts} productos • Esperado:{' '}
                            {group.totalExpected.toLocaleString('es-MX')} • Contado:{' '}
                            {group.totalCounted.toLocaleString('es-MX')}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-zinc-300">
                          {isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-white/10 px-4 py-4 sm:px-5">
                          <div className="space-y-4">
                            {group.items.map((item, index) => {
                              const realIndex = getRealItemIndex(item);
                              const itemKey = `${inventory.id}-${realIndex}`;
                              const counted = getCountedQuantity(item);
                              const expected = safeNumber(item.expectedQuantity);
                              const difference = counted - expected;
                              const tags = buildItemTags(item);
                              const draft = getDraft(itemKey);
                              const entries = getCountEntries(item);

                              return (
                                <div
                                  key={`${itemKey}-${cleanText(item?.productName || index)}`}
                                  className="rounded-[24px] border border-white/10 bg-[#050505] p-4"
                                >
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                      <p className="break-words font-semibold text-white">
                                        {item.productName || 'Producto sin nombre'}
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
                                              {safeNumber(tag.quantity).toLocaleString('es-MX')}
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
                                    <div className="rounded-xl border border-white/10 bg-black px-3 py-2">
                                      <span className="block text-xs text-zinc-500">
                                        Stock esperado
                                      </span>
                                      <span className="text-zinc-200">
                                        {expected.toLocaleString('es-MX')}
                                      </span>
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-black px-3 py-2">
                                      <span className="block text-xs text-zinc-500">
                                        No disponible
                                      </span>
                                      <span className="text-zinc-200">
                                        {safeNumber(item.unavailableQuantity).toLocaleString(
                                          'es-MX'
                                        )}
                                      </span>
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-black px-3 py-2">
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

                                    <div className="rounded-xl border border-white/10 bg-black px-3 py-2">
                                      <span className="block text-xs text-zinc-500">
                                        Sobra
                                      </span>
                                      <span className="text-emerald-300">
                                        {difference > 0
                                          ? difference.toLocaleString('es-MX')
                                          : '0'}
                                      </span>
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-black px-3 py-2">
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
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black p-4">
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
                                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-blue-500"
                                            placeholder="Ej. 20"
                                          />
                                        </div>

                                        <div>
                                          <label className="mb-1 block text-xs text-zinc-500">
                                            Observación
                                          </label>
                                          <CustomSelect

                                            value={draft.observationType}

                                            onChange={(nextValue) =>

                                              updateDraft(itemKey, {

                                                observationType: nextValue,

                                              })

                                            }

                                            options={OBSERVATION_OPTIONS}

                                            buttonClassName="min-h-[42px] rounded-xl bg-white/[0.03] px-3 py-2"

                                          />
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
                                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-blue-500"
                                            placeholder="Opcional"
                                          />
                                        </div>
                                      </div>

                                      <div className="mt-3 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => handleAddEntry(item)}
                                          disabled={Boolean(busyAdd[itemKey])}
                                          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                                        >
                                          {busyAdd[itemKey] ? (
                                            <Loader2 size={16} className="animate-spin" />
                                          ) : (
                                            <Plus size={16} />
                                          )}
                                          {busyAdd[itemKey] ? 'Agregando...' : 'Agregar conteo'}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-4 rounded-2xl border border-white/10 bg-black p-4">
                                    <p className="mb-3 text-sm font-medium text-white">
                                      Conteos registrados
                                    </p>

                                    {entries.length === 0 ? (
                                      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-500">
                                        Aún no hay conteos para este producto.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {entries.map((entry) => (
                                          <div
                                            key={entry.id}
                                            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 lg:flex-row lg:items-center lg:justify-between"
                                          >
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                  className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${getTagClasses(
                                                    entry?.observationType || 'Buen estado'
                                                  )}`}
                                                >
                                                  {entry?.observationType || 'Buen estado'}
                                                </span>

                                                <span className="text-sm font-semibold text-white">
                                                  {safeNumber(entry.quantity).toLocaleString('es-MX')}
                                                </span>
                                              </div>

                                              <p className="mt-2 text-xs text-zinc-400">
                                                {entry.comment || 'Sin comentario'}
                                              </p>

                                              <p className="mt-1 text-xs text-zinc-600">
                                                {entry.createdByEmail ||
                                                  entry.createdBy ||
                                                  'Sin usuario'}{' '}
                                                ·{' '}
                                                {entry.createdAtLabel ||
                                                  entry.createdAt ||
                                                  'Sin fecha'}
                                              </p>
                                            </div>

                                            {isEditMode && (
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteEntry(item, entry.id)}
                                                disabled={Boolean(busyDelete[entry.id])}
                                                className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/50 disabled:opacity-60"
                                              >
                                                {busyDelete[entry.id] ? (
                                                  <Loader2 size={14} className="animate-spin" />
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


