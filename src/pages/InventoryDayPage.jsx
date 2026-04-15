import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  FileUp,
  Search,
  ClipboardList,
  AlertTriangle,
  Package,
  Boxes,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseInventoryPdf } from '../services/pdfInventoryParser';
import {
  saveDailyInventoryFromPdf,
  subscribeInventoryByDate,
  subscribeAllInventories,
} from '../services/inventory';

/**
 * Devuelve la fecha actual en formato yyyy-mm-dd.
 */
function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convierte un dateKey (yyyy-mm-dd) a una etiqueta en español.
 */
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

export default function InventoryDayPage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Fecha de hoy en formato clave y etiqueta.
  const todayDateKey = useMemo(() => getTodayDateKey(), []);
  const todayLabel = useMemo(
    () => formatDateLabelFromKey(todayDateKey),
    [todayDateKey]
  );

  // Estado local.
  const [todayInventory, setTodayInventory] = useState(null);
  const [allInventories, setAllInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Suscripciones en tiempo real al inventario de hoy y al historial.
  useEffect(() => {
    setLoading(true);
    const unsubscribeToday = subscribeInventoryByDate(todayDateKey, (inv) => {
      setTodayInventory(inv);
      setLoading(false);
    });
    const unsubscribeAll = subscribeAllInventories((list) =>
      setAllInventories(list || [])
    );
    return () => {
      unsubscribeToday();
      unsubscribeAll();
    };
  }, [todayDateKey]);

  // Filtra los productos del inventario de hoy según la búsqueda.
  const filteredItems = useMemo(() => {
    const items = todayInventory?.items || [];
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      return (
        item.productName?.toLowerCase().includes(term) ||
        item.categoryName?.toLowerCase().includes(term) ||
        item.supplierName?.toLowerCase().includes(term)
      );
    });
  }, [todayInventory, search]);

  // Estadísticas básicas para la tarjeta del inventario.
  const stats = useMemo(() => {
    const items = todayInventory?.items || [];
    return {
      totalProducts: items.length,
      ok: items.filter((i) => i.status === 'OK').length,
      alerta: items.filter((i) => i.status === 'ALERTA').length,
      faltante: items.filter((i) => i.status === 'FALTANTE').length,
      totalStockEsperado: items.reduce(
        (sum, item) => sum + (Number(item.expectedQuantity) || 0),
        0
      ),
      totalNoDisponible: items.reduce(
        (sum, item) => sum + (Number(item.unavailableQuantity) || 0),
        0
      ),
    };
  }, [todayInventory]);

  // Abrir selector de archivo.
  const handleOpenPicker = () => fileInputRef.current?.click();

  // Gestión de PDF.
  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const parsed = await parseInventoryPdf(selectedFile);
      // Validamos la fecha del PDF.
      if (parsed.dateKey !== todayDateKey) {
        setError(
          `La fecha del PDF (${parsed.dateLabel}) no coincide con la fecha actual (${todayLabel}).`
        );
        setUploading(false);
        event.target.value = '';
        return;
      }
      // Guardamos el inventario; Firestore se encarga de actualizar o crear.
      const saved = await saveDailyInventoryFromPdf(parsed, user?.email || '');
      // Mostramos feedback inmediato; la suscripción se encargará de sincronizar luego.
      setTodayInventory(saved);
      setSuccess(`Inventario del ${parsed.dateLabel} cargado correctamente.`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo procesar el PDF.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  // Colores de estado para los productos.
  const getStatusColor = (status) => {
    switch (status) {
      case 'OK':
        return 'border-emerald-900/60 bg-emerald-950/50 text-emerald-400';
      case 'ALERTA':
        return 'border-yellow-900/60 bg-yellow-950/50 text-yellow-400';
      case 'FALTANTE':
        return 'border-red-900/60 bg-red-950/50 text-red-400';
      default:
        return 'border-zinc-800 bg-zinc-900 text-zinc-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Input oculto para cargar el PDF */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Sección de encabezado y subida de PDF */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Inventario Diario
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              Sube el PDF del día y el sistema agregará automáticamente el
              inventario con fecha, semana, cedis, categorías y productos.
            </p>
          </div>
          <button
            onClick={handleOpenPicker}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileUp size={18} />
            {uploading ? 'Procesando PDF...' : 'Subir PDF del día'}
          </button>
        </div>
      </section>

      {/* Mensajes de error o éxito */}
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

      {/* Tarjetas con estadísticas y usuario */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-blue-400">
              <CalendarDays size={22} />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Hoy</p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {todayLabel}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-emerald-400">
              <ClipboardList size={22} />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Inventario de hoy</p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {loading
                  ? 'Cargando...'
                  : todayInventory
                    ? 'Cargado'
                    : 'Pendiente'}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-yellow-400">
              <Boxes size={22} />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Categorías del inventario</p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {todayInventory?.categories?.length || 0}
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
              <p className="text-sm text-zinc-400">Usuario actual</p>
              <h2 className="mt-2 break-all text-lg font-bold text-white">
                {user?.email || 'Sin usuario'}
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Inventario de hoy con productos y búsqueda */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Inventario activo del día
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Si subes otro PDF con la misma fecha, este inventario se
              actualizará.
            </p>
          </div>
          {todayInventory?.id && (
            <Link
              to={`/inventario/${todayInventory.id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 bg-black px-4 py-3 font-medium text-white transition hover:border-zinc-500"
            >
              Abrir detalle
            </Link>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
            Cargando inventario...
          </div>
        ) : !todayInventory ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-black px-4 py-6 text-zinc-400">
            Aún no has subido el PDF del inventario de hoy.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tarjetas de resumen del inventario */}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">Fecha</p>
                <p className="mt-2 font-semibold text-white">
                  {todayInventory.date || 'Sin fecha'}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">Semana</p>
                <p className="mt-2 font-semibold text-white">
                  {todayInventory.week || 'Sin semana'}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">Cedis</p>
                <p className="mt-2 font-semibold text-white">
                  {todayInventory.cedis || 'Sin cedis'}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">Productos</p>
                <p className="mt-2 font-semibold text-white">
                  {stats.totalProducts}
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
            </div>

            {/* Resumen por estado */}
            <div className="grid gap-3 sm:grid-cols-3">
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

            {/* Input de búsqueda */}
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
              <Search size={18} className="text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto o categoría..."
                className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
              />
            </div>

            {/* Lista de productos */}
            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
                  No hay productos que coincidan con la búsqueda.
                </div>
              ) : (
                filteredItems.slice(0, 80).map((item, index) => (
                  <div
                    key={`${item.productName}-${index}`}
                    className="rounded-2xl border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                      </div>
                      <span
                        className={`inline-flex items-center rounded-xl border px-3 py-1 text-sm font-medium ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                        <span className="block text-xs text-zinc-500">
                          Cantidad esperada
                        </span>
                        <span className="text-zinc-200">
                          {Number(item.expectedQuantity || 0).toLocaleString(
                            'es-MX'
                          )}
                        </span>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                        <span className="block text-xs text-zinc-500">
                          No disponible
                        </span>
                        <span className="text-zinc-200">
                          {Number(item.unavailableQuantity || 0).toLocaleString(
                            'es-MX'
                          )}
                        </span>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                        <span className="block text-xs text-zinc-500">
                          Conteo físico
                        </span>
                        <span className="text-zinc-200">
                          {item.countedQuantity || 'Pendiente'}
                        </span>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                        <span className="block text-xs text-zinc-500">
                          Observación
                        </span>
                        <span className="text-zinc-200">
                          {item.observation || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredItems.length > 80 && (
              <p className="text-sm text-zinc-500">
                Se muestran los primeros 80 resultados. Usa la búsqueda para
                filtrar.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Historial de inventarios con navegación a detalle o edición */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">
            Historial de inventarios
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Inventarios guardados por fecha.
          </p>
        </div>
        <div className="space-y-3">
          {allInventories.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
              No hay inventarios registrados todavía.
            </div>
          ) : (
            allInventories.slice(0, 20).map((inv) => {
              const isToday = inv.dateKey === todayDateKey;
              return (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        {inv.date || 'Sin fecha'}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Semana {inv.week || '—'} · {inv.cedis || 'Sin cedis'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {inv.items?.length || 0} productos
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/inventario/${inv.id}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-2 font-medium text-white transition hover:border-zinc-500"
                      >
                        Ver detalle
                      </Link>
                      {/* Mostrar botón Editar solo si corresponde al día de hoy */}
                      {isToday && (
                        <Link
                          to={`/inventario/${inv.id}/editar`}
                          className="inline-flex items-center justify-center rounded-2xl border border-blue-700 bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500"
                        >
                          Editar
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Aviso sobre actualización */}
      <section className="rounded-3xl border border-yellow-900/60 bg-yellow-950/20 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 text-yellow-400" size={20} />
          <div className="text-sm leading-7 text-yellow-100">
            Si subes un PDF del mismo día, el sistema actualizará ese inventario
            en vez de duplicarlo.
          </div>
        </div>
      </section>
    </div>
  );
}
