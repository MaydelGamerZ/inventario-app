import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Search, ClipboardList, Package } from 'lucide-react';
import { subscribeAllInventories } from '../services/inventory';

function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(dateString) {
  if (!dateString) return 'Sin fecha';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date);
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
      setInventories(list || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredInventories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return inventories;
    return inventories.filter((inv) => {
      const searchable = [
        inv.date,
        inv.week,
        inv.cedis,
        inv.importedByEmail,
        inv.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [inventories, search]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-3xl font-bold text-white">
          Historial de Inventarios
        </h1>
        <p className="mt-2 text-zinc-400">
          Aquí verás los inventarios guardados por fecha.
        </p>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              placeholder="Buscar por fecha, cedis, usuario o nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black/40 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500/50"
            />
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-400">Cargando inventarios...</p>
        </section>
      ) : filteredInventories.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
            <Package className="text-zinc-400" size={26} />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">
            No hay inventarios guardados
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-400 md:text-base">
            Aquí aparecerán los inventarios cuando los guardes desde Inventario
            Diario.
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredInventories.map((inv) => {
            const isToday = inv.dateKey === todayDateKey;
            return (
              <article
                key={inv.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 md:p-5 transition hover:border-zinc-700"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white md:text-xl">
                        {formatDate(inv.date)}
                      </h2>
                      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                        {inv.cedis || 'Sin cedis'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-400 md:flex-row md:flex-wrap md:items-center md:gap-4">
                      {inv.week && (
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays size={16} /> Semana {inv.week}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-2">
                        <ClipboardList size={16} /> {inv.items?.length || 0}{' '}
                        productos
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 md:mt-0">
                    <button
                      onClick={() => navigate(`/inventario/${inv.id}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                      Ver detalle
                    </button>
                    {isToday && (
                      <button
                        onClick={() => navigate(`/inventario/${inv.id}/editar`)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
                      >
                        Editar
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
