import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Search,
  ClipboardList,
  Package,
  Download,
  Loader2,
  History,
  Building2,
  Pencil,
  Eye,
  X,
  Filter,
  CheckCircle2,
  Clock3,
  FileWarning,
  Hash,
} from 'lucide-react';
import { subscribeAllInventories } from '../services/inventory';
import { exportInventoryToPDF } from '../services/pdfExporter';

function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function safeNumber(value) {
  const parsed = Number(
    String(value ?? '')
      .replace(/,/g, '')
      .trim()
  );
  return Number.isNaN(parsed) ? 0 : parsed;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(dateValue) {
  if (!dateValue) return 'Sin fecha';

  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split('-').map(Number);
    const safeDate = new Date(year, (month || 1) - 1, day || 1);

    if (!Number.isNaN(safeDate.getTime())) {
      return new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(safeDate);
    }
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Fecha inválida';

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function getInventoryDateLabel(inv) {
  return (
    cleanText(inv?.dateLabel) ||
    cleanText(inv?.date) ||
    formatDate(cleanText(inv?.dateKey)) ||
    'Sin fecha'
  );
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

function hasStartedCount(inv) {
  if (inv?.countingStarted) return true;

  const items = Array.isArray(inv?.items) ? inv.items : [];

  return items.some((item) => {
    return (
      getCountEntries(item).length > 0 || safeNumber(item?.countedQuantity) > 0
    );
  });
}

function getInventoryStatus(inv) {
  const items = Array.isArray(inv?.items) ? inv.items : [];

  if (inv?.status === 'GUARDADO') return 'GUARDADO';
  if (items.length === 0) return 'VACÍO';
  if (hasStartedCount(inv)) return 'CONTEO INICIADO';
  if (inv?.status === 'BORRADOR') return 'BORRADOR';

  return 'PENDIENTE';
}

function getStatusBadgeClasses(status) {
  switch (status) {
    case 'GUARDADO':
      return 'border-emerald-900/60 bg-emerald-950/40 text-emerald-300';
    case 'CONTEO INICIADO':
      return 'border-blue-900/60 bg-blue-950/40 text-blue-300';
    case 'BORRADOR':
      return 'border-yellow-900/60 bg-yellow-950/40 text-yellow-300';
    case 'PENDIENTE':
      return 'border-orange-900/60 bg-orange-950/40 text-orange-300';
    case 'VACÍO':
      return 'border-white/10 bg-white/[0.03] text-zinc-300';
    default:
      return 'border-white/10 bg-white/[0.03] text-zinc-300';
  }
}

function getSortableDate(inv) {
  const raw = inv?.dateKey || inv?.date;
  if (!raw) return 0;

  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1).getTime();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function getInventorySummary(inv) {
  const items = Array.isArray(inv?.items) ? inv.items : [];

  const totalProducts = items.length;
  const totalExpected = items.reduce(
    (sum, item) => sum + safeNumber(item?.expectedQuantity),
    0
  );
  const totalCounted = items.reduce(
    (sum, item) => sum + getCountedQuantity(item),
    0
  );
  const countedProducts = items.filter(
    (item) => getCountedQuantity(item) > 0
  ).length;

  return {
    totalProducts,
    totalExpected,
    totalCounted,
    countedProducts,
  };
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#050505] p-4 sm:p-5">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function InventoryHistoryPage() {
  const [inventories, setInventories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('all');

  const navigate = useNavigate();
  const todayDateKey = useMemo(() => getTodayDateKey(), []);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeAllInventories(
      (list) => {
        const normalized = Array.isArray(list) ? list : [];
        setInventories(normalized);
        setLoading(false);
      },
      { includeDrafts: true }
    );

    return () => unsubscribe?.();
  }, []);

  const processedInventories = useMemo(() => {
    return [...inventories]
      .map((inv) => {
        const status = getInventoryStatus(inv);
        const summary = getInventorySummary(inv);

        return {
          ...inv,
          _computedStatus: status,
          _summary: summary,
        };
      })
      .sort((a, b) => getSortableDate(b) - getSortableDate(a));
  }, [inventories]);

  const filteredInventories = useMemo(() => {
    const term = cleanText(search).toLowerCase();

    return processedInventories.filter((inv) => {
      const status = inv._computedStatus;
      const isToday = inv?.dateKey === todayDateKey;
      const started = status === 'CONTEO INICIADO';

      if (filterMode === 'saved' && status !== 'GUARDADO') return false;

      if (
        filterMode === 'draft' &&
        status !== 'BORRADOR' &&
        status !== 'PENDIENTE'
      ) {
        return false;
      }

      if (filterMode === 'today' && !isToday) return false;
      if (filterMode === 'started' && !started) return false;

      if (!term) return true;

      const searchable = [
        inv?.dateLabel,
        inv?.date,
        inv?.dateKey,
        inv?.week,
        inv?.cedis,
        inv?.importedByEmail,
        inv?.notes,
        inv?.status,
        status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [processedInventories, search, filterMode, todayDateKey]);

  const stats = useMemo(() => {
    const total = processedInventories.length;
    const today = processedInventories.filter(
      (inv) => inv?.dateKey === todayDateKey
    ).length;
    const withCounts = processedInventories.filter(
      (inv) => inv._computedStatus === 'CONTEO INICIADO'
    ).length;
    const saved = processedInventories.filter(
      (inv) => inv._computedStatus === 'GUARDADO'
    ).length;
    const totalProducts = processedInventories.reduce(
      (sum, inv) => sum + (inv?._summary?.totalProducts || 0),
      0
    );

    return {
      total,
      today,
      withCounts,
      saved,
      totalProducts,
    };
  }, [processedInventories, todayDateKey]);

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <section className="rounded-[28px] border border-white/10 bg-[#050505] p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.03] text-blue-400 sm:h-14 sm:w-14">
            <History size={22} />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Historial de Inventarios
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
              Aquí verás todos los inventarios, con acceso rápido a detalle,
              edición cuando aplique y descarga en PDF.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Inventarios totales" value={stats.total} />
        <StatCard title="Inventarios de hoy" value={stats.today} />
        <StatCard title="Conteo iniciado" value={stats.withCounts} />
        <StatCard title="Guardados finales" value={stats.saved} />
        <StatCard
          title="Productos acumulados"
          value={stats.totalProducts.toLocaleString('es-MX')}
        />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050505] p-4 md:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-xl">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                placeholder="Buscar por fecha, semana, cedis, usuario, nota o estado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/50 py-3 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                filterMode === 'all'
                  ? 'border-blue-700 bg-blue-600 text-white'
                  : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]'
              }`}
            >
              <Filter size={16} />
              Todos
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('saved')}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                filterMode === 'saved'
                  ? 'border-emerald-700 bg-emerald-600 text-white'
                  : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]'
              }`}
            >
              <CheckCircle2 size={16} />
              Guardados
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('draft')}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                filterMode === 'draft'
                  ? 'border-yellow-700 bg-yellow-600 text-white'
                  : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]'
              }`}
            >
              <Clock3 size={16} />
              Borradores
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('today')}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                filterMode === 'today'
                  ? 'border-blue-700 bg-blue-600 text-white'
                  : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]'
              }`}
            >
              <CalendarDays size={16} />
              Hoy
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('started')}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                filterMode === 'started'
                  ? 'border-blue-700 bg-blue-600 text-white'
                  : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]'
              }`}
            >
              <ClipboardList size={16} />
              Conteo iniciado
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-[28px] border border-white/10 bg-[#050505] p-8 text-center">
          <div className="flex items-center justify-center gap-3 text-zinc-400">
            <Loader2 size={18} className="animate-spin" />
            <p>Cargando inventarios...</p>
          </div>
        </section>
      ) : filteredInventories.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-white/10 bg-[#050505] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <FileWarning className="text-zinc-400" size={26} />
          </div>

          <h2 className="mt-4 text-xl font-semibold text-white">
            {inventories.length === 0
              ? 'No hay inventarios todavía'
              : 'No hubo coincidencias en la búsqueda'}
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-400 md:text-base">
            {inventories.length === 0
              ? 'Aquí aparecerán los inventarios cuando los cargues o guardes desde Inventario Diario.'
              : 'Prueba con otra fecha, cedis, semana, estado o palabra clave.'}
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredInventories.map((inv) => {
            const isToday = inv?.dateKey === todayDateKey;
            const inventoryStatus = inv._computedStatus;
            const summary = inv._summary;
            const canEdit =
              inventoryStatus !== 'GUARDADO' && inventoryStatus !== 'VACÍO';

            return (
              <article
                key={inv.id}
                className="rounded-[28px] border border-white/10 bg-[#050505] p-4 transition hover:border-white/20 md:p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white md:text-xl">
                        {getInventoryDateLabel(inv)}
                      </h2>

                      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                        {cleanText(inv?.cedis) || 'Sin cedis'}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                          inventoryStatus
                        )}`}
                      >
                        {inventoryStatus}
                      </span>

                      {isToday && (
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-200">
                          Hoy
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-400 md:flex-row md:flex-wrap md:items-center md:gap-4">
                      {inv?.week && (
                        <span className="inline-flex items-center gap-2">
                          <Hash size={16} />
                          Semana {inv.week}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-2">
                        <ClipboardList size={16} />
                        {summary.totalProducts.toLocaleString('es-MX')}{' '}
                        productos
                      </span>

                      <span className="inline-flex items-center gap-2">
                        <Package size={16} />
                        Conteo físico:{' '}
                        {summary.totalCounted.toLocaleString('es-MX')}
                      </span>

                      {inv?.importedByEmail && (
                        <span className="inline-flex items-center gap-2 break-all">
                          <Building2 size={16} />
                          {inv.importedByEmail}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                          Stock esperado
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {summary.totalExpected.toLocaleString('es-MX')}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                          Conteo físico
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {summary.totalCounted.toLocaleString('es-MX')}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                          Productos contados
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {summary.countedProducts.toLocaleString('es-MX')}
                        </p>
                      </div>
                    </div>

                    {inv?.notes && (
                      <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                          Nota
                        </p>
                        <p className="mt-1 break-words text-sm text-zinc-300">
                          {inv.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row xl:mt-0">
                    <button
                      onClick={() =>
                        navigate(`/inventario/${inv.id}`, {
                          state: { from: 'history' },
                        })
                      }
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]"
                    >
                      <Eye size={16} />
                      Ver detalle
                    </button>

                    {canEdit && (
                      <button
                        onClick={() =>
                          navigate(`/inventario/${inv.id}/editar`, {
                            state: { from: 'history' },
                          })
                        }
                        className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                    )}

                    {inventoryStatus === 'GUARDADO' && (
                      <button
                        onClick={() => exportInventoryToPDF(inv)}
                        className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500"
                      >
                        <Download size={16} />
                        Descargar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
