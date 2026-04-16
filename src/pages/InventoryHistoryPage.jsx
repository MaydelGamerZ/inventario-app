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

function getInventoryStatus(inv) {
  const items = Array.isArray(inv?.items) ? inv.items : [];

  if (items.length === 0) return 'VACÍO';
  if (items.some((item) => item?.countedQuantity != null && String(item.countedQuantity).trim() !== '')) {
    return 'CONTEO INICIADO';
  }
  return 'PENDIENTE';
}

function getStatusBadgeClasses(status) {
  switch (status) {
    case 'CONTEO INICIADO':
      return 'border-emerald-900/60 bg-emerald-950/50 text-emerald-400';
    case 'PENDIENTE':
      return 'border-yellow-900/60 bg-yellow-950/50 text-yellow-400';
    case 'VACÍO':
      return 'border-zinc-800 bg-zinc-900 text-zinc-300';
    default:
      return 'border-zinc-800 bg-zinc-900 text-zinc-300';
  }
}

export default function InventoryHistoryPage() {
  const [inventories, setInventories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const todayDateKey = useMemo(() => getTodayDateKey(), []);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeAllInventories((list) => {
      setInventories(Array.isArray(list) ? list : []);
      setLoading(false);
    });

    return () => unsubscribe?.();
  }, []);

  const filteredInventories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return inventories;

    return inventories.filter((inv) => {
      const searchable = [
        inv?.date,
        inv?.dateKey,
        inv?.week,
        inv?.cedis,
        inv?.importedByEmail,
        inv?.notes,
        inv?.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [inventories, search]);

  const stats = useMemo(() => {
    const total = inventories.length;
    const today = inventories.filter((inv) => inv?.dateKey === todayDateKey).length;
    const withCounts = inventories.filter((inv) =>
      (inv?.items || []).some(
        (item) =>
          item?.countedQuantity != null &&
          String(item.countedQuantity).trim() !== ''
      )
    ).length;

    const totalProducts = inventories.reduce(
      (sum, inv) => sum + ((inv?.items || []).length || 0),
      0
    );

    return {
      total,
      today,
      withCounts,
      totalProducts,
    };
  }, [inventories, todayDateKey]);

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Encabezado */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-blue-400">
            <History size={24} />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Historial de Inventarios
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              Aquí verás todos los inventarios guardados por fecha, con acceso
              rápido a detalle, edición del día actual y descarga en PDF.
            </p>
          </div>
        </div>
      </section>

      {/* Resumen */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">Inventarios guardados</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">Inventarios de hoy</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.today}</p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">Con conteo iniciado</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.withCounts}</p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">Productos acumulados</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {stats.totalProducts.toLocaleString('es-MX')}
          </p>
        </div>
      </section>

      {/* Buscador */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 md:p-5">
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
              className="w-full rounded-2xl border border-zinc-800 bg-black/50 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Estados */}
      {loading ? (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <div className="flex items-center justify-center gap-3 text-zinc-400">
            <Loader2 size={18} className="animate-spin" />
            <p>Cargando inventarios...</p>
          </div>
        </section>
      ) : filteredInventories.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
            <Package className="text-zinc-400" size={26} />
          </div>

          <h2 className="mt-4 text-xl font-semibold text-white">
            {inventories.length === 0
              ? 'No hay inventarios guardados'
              : 'No hubo coincidencias en la búsqueda'}
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-400 md:text-base">
            {inventories.length === 0
              ? 'Aquí aparecerán los inventarios cuando los guardes desde Inventario Diario.'
              : 'Prueba con otra fecha, cedis, semana o palabra clave.'}
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredInventories.map((inv) => {
            const isToday = inv?.dateKey === todayDateKey;
            const inventoryStatus = getInventoryStatus(inv);

            return (
              <article
                key={inv.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700 md:p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white md:text-xl">
                        {formatDate(inv?.date || inv?.dateKey)}
                      </h2>

                      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                        {inv?.cedis || 'Sin cedis'}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                          inventoryStatus
                        )}`}
                      >
                        {inventoryStatus}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-400 md:flex-row md:flex-wrap md:items-center md:gap-4">
                      {inv?.week && (
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays size={16} />
                          Semana {inv.week}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-2">
                        <ClipboardList size={16} />
                        {(inv?.items?.length || 0).toLocaleString('es-MX')} productos
                      </span>

                      {inv?.importedByEmail && (
                        <span className="inline-flex items-center gap-2 break-all">
                          <Building2 size={16} />
                          {inv.importedByEmail}
                        </span>
                      )}
                    </div>

                    {inv?.notes && (
                      <div className="mt-3 rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                          Nota
                        </p>
                        <p className="mt-1 break-words text-sm text-zinc-300">
                          {inv.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 sm:flex-row xl:mt-0">
                    <button
                      onClick={() => navigate(`/inventario/${inv.id}`)}
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                      <Eye size={16} />
                      Ver detalle
                    </button>

                    {isToday && (
                      <button
                        onClick={() => navigate(`/inventario/${inv.id}/editar`)}
                        className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                    )}

                    <button
                      onClick={() => exportInventoryToPDF(inv)}
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500"
                    >
                      <Download size={16} />
                      Descargar
                    </button>
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