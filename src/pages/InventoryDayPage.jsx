import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  FileUp,
  Search,
  ClipboardList,
  AlertTriangle,
  Package,
  Boxes,
  Download,
  Loader2,
  CheckCircle2,
  Bell,
  Play,
  Pencil,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseInventoryPdf } from '../services/pdfInventoryParser';
import {
  saveDailyInventoryFromPdf,
  subscribeInventoryByDate,
  subscribeAllInventories,
  startInventoryCount,
} from '../services/inventory';
import { exportInventoryToPDF } from '../services/pdfExporter';

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

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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

function getInventoryStatusLabel(inventory) {
  if (!inventory) return 'Pendiente';
  if (inventory.status === 'GUARDADO') return 'Guardado';
  if (inventory.countingStarted) return 'Conteo en proceso';
  return 'Cargado';
}

function isIosStandalone() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const standalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;

  const legacyStandalone =
    typeof navigator.standalone === 'boolean' ? navigator.standalone : false;

  return Boolean(standalone || legacyStandalone);
}

export default function InventoryDayPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const previousStatusRef = useRef('');

  const todayDateKey = useMemo(() => getTodayDateKey(), []);
  const todayLabel = useMemo(
    () => formatDateLabelFromKey(todayDateKey),
    [todayDateKey]
  );

  const [todayInventory, setTodayInventory] = useState(null);
  const [allInventories, setAllInventories] = useState([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [startingCount, setStartingCount] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [iosUploadHelp, setIosUploadHelp] = useState(false);

  useEffect(() => {
    setLoadingToday(true);
    setLoadingHistory(true);

    const unsubscribeToday = subscribeInventoryByDate(todayDateKey, (inv) => {
      setTodayInventory(inv || null);
      setLoadingToday(false);
    });

    const unsubscribeAll = subscribeAllInventories((list) => {
      setAllInventories(Array.isArray(list) ? list : []);
      setLoadingHistory(false);
    });

    return () => {
      unsubscribeToday?.();
      unsubscribeAll?.();
    };
  }, [todayDateKey]);

  useEffect(() => {
    if (!todayInventory) {
      previousStatusRef.current = '';
      return;
    }

    const currentStatus = todayInventory.status || '';
    const previousStatus = previousStatusRef.current;

    if (
      previousStatus &&
      previousStatus !== 'GUARDADO' &&
      currentStatus === 'GUARDADO'
    ) {
      const whoSaved =
        todayInventory.finalizedByEmail ||
        todayInventory.savedByEmail ||
        'Otro usuario';

      setSaveNotice(`${whoSaved} guardó el conteo final.`);
    }

    previousStatusRef.current = currentStatus;
  }, [todayInventory]);

  const filteredItems = useMemo(() => {
    const items = todayInventory?.items || [];
    const term = search.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) => {
      const observationLabels = Object.keys(
        summarizeEntries(item?.countEntries || [])
      )
        .join(' ')
        .toLowerCase();

      return (
        item.productName?.toLowerCase().includes(term) ||
        item.categoryName?.toLowerCase().includes(term) ||
        item.supplierName?.toLowerCase().includes(term) ||
        observationLabels.includes(term) ||
        item.status?.toLowerCase().includes(term)
      );
    });
  }, [todayInventory, search]);

  const stats = useMemo(() => {
    const items = todayInventory?.items || [];

    return {
      totalProducts: items.length,
      totalCategories: todayInventory?.categories?.length || 0,
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
  }, [todayInventory]);

  const canDownload = todayInventory?.status === 'GUARDADO';
  const isDraft = todayInventory?.status === 'BORRADOR';
  const hasInventory = !!todayInventory;
  const isCountStarted = Boolean(todayInventory?.countingStarted);
  const showIosStandaloneHelp = isIosStandalone();

  const resetMessages = () => {
    setError('');
    setSuccess('');
    setSaveNotice('');
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    resetMessages();
    setIosUploadHelp(false);
    setUploading(true);

    try {
      const parsed = await parseInventoryPdf(selectedFile);

      if (!parsed) {
        throw new Error('No se pudo leer el contenido del PDF.');
      }

      if (parsed.dateKey !== todayDateKey) {
        throw new Error(
          `La fecha del PDF (${parsed.dateLabel || 'desconocida'}) no coincide con la fecha actual (${todayLabel}).`
        );
      }

      await saveDailyInventoryFromPdf(parsed, user?.email || '');
      setSuccess(`Inventario del ${parsed.dateLabel} cargado correctamente.`);
    } catch (err) {
      console.error(err);

      const rawMessage =
        typeof err?.message === 'string'
          ? err.message
          : 'No se pudo procesar el PDF en este dispositivo.';

      if (
        /undefined is not a function/i.test(rawMessage) ||
        /not a function/i.test(rawMessage)
      ) {
        setError(
          'Este navegador móvil tuvo un problema al leer el PDF. Intenta abrir la app en Safari normal o en Chrome actualizado, o vuelve a seleccionar el archivo.'
        );
      } else {
        setError(rawMessage);
      }
    } finally {
      setUploading(false);

      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleInputPointerDown = () => {
    resetMessages();

    if (showIosStandaloneHelp) {
      setIosUploadHelp(true);
    }
  };

  const handleStartCount = async () => {
    if (!todayInventory?.id) return;

    try {
      setStartingCount(true);
      resetMessages();

      await startInventoryCount(todayInventory.id);
      navigate(`/inventario/${todayInventory.id}/editar`);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'No se pudo iniciar el conteo.');
    } finally {
      setStartingCount(false);
    }
  };

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Inventario Diario
            </h1>

            <p className="mt-2 text-sm leading-7 text-zinc-400 sm:text-base">
              Sube el PDF del día y el sistema agregará automáticamente fecha,
              semana, cedis, categorías y productos. El conteo real comienza al
              presionar{' '}
              <span className="font-medium text-white">Iniciar conteo</span>.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[320px]">
            <label
              className={`relative inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 ${
                uploading ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <FileUp size={18} />
              )}
              {uploading ? 'Procesando PDF...' : 'Subir PDF del día'}

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                onPointerDown={handleInputPointerDown}
                onTouchStart={handleInputPointerDown}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>

            <label
              className={`relative inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 font-semibold text-white transition hover:bg-zinc-800 ${
                uploading ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              <Upload size={18} />
              Elegir archivo

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                onPointerDown={handleInputPointerDown}
                onTouchStart={handleInputPointerDown}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
      </section>

      {showIosStandaloneHelp && iosUploadHelp && (
        <section className="rounded-2xl border border-yellow-900/60 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-100">
          En iPhone como app web, el selector de archivos puede fallar según iOS.
          Si no abre, prueba abrir esta misma página en Safari o Chrome normal.
        </section>
      )}

      {error && (
        <section className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </section>
      )}

      {success && (
        <section className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        </section>
      )}

      {saveNotice && (
        <section className="rounded-2xl border border-blue-900/60 bg-blue-950/40 px-4 py-3 text-sm text-blue-200">
          <div className="flex items-start gap-2">
            <Bell size={18} className="mt-0.5 shrink-0" />
            <span>{saveNotice}</span>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-blue-400">
              <CalendarDays size={22} />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-zinc-400">Hoy</p>
              <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
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

            <div className="min-w-0">
              <p className="text-sm text-zinc-400">Inventario de hoy</p>
              <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                {loadingToday
                  ? 'Cargando...'
                  : getInventoryStatusLabel(todayInventory)}
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
              <p className="text-sm text-zinc-400">Usuario actual</p>
              <h2 className="mt-2 break-all text-base font-bold text-white sm:text-lg">
                {user?.email || 'Sin usuario'}
              </h2>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Inventario activo del día
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Mientras siga en borrador, los conteos pueden reflejarse en tiempo
              real entre usuarios. Solo al guardar final aparecerá en historial
              y se podrá descargar.
            </p>
          </div>

          {hasInventory && (
            <div className="flex flex-col gap-2 sm:flex-row">
              {!isCountStarted && (
                <button
                  onClick={handleStartCount}
                  disabled={startingCount}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {startingCount ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Play size={18} />
                  )}
                  {startingCount ? 'Iniciando...' : 'Iniciar conteo'}
                </button>
              )}

              {isCountStarted && isDraft && (
                <Link
                  to={`/inventario/${todayInventory.id}/editar`}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
                >
                  <Pencil size={18} />
                  Continuar conteo
                </Link>
              )}

              {todayInventory?.status === 'GUARDADO' && (
                <Link
                  to={`/inventario/${todayInventory.id}`}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-zinc-700 bg-black px-4 py-3 font-medium text-white transition hover:border-zinc-500"
                >
                  Ver detalle
                </Link>
              )}

              {canDownload && (
                <button
                  onClick={() => exportInventoryToPDF(todayInventory)}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500"
                >
                  <Download size={18} />
                  Descargar
                </button>
              )}
            </div>
          )}
        </div>

        {loadingToday ? (
          <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
            Cargando inventario...
          </div>
        ) : !todayInventory ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-black px-4 py-6 text-zinc-400">
            Aún no has subido el PDF del inventario de hoy.
          </div>
        ) : (
          <div className="space-y-4">
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
                <p className="mt-2 break-words font-semibold text-white">
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

            <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
              <Search size={18} className="shrink-0 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto, categoría, proveedor u observación..."
                className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
                  No hay productos que coincidan con la búsqueda.
                </div>
              ) : (
                filteredItems.slice(0, 80).map((item, index) => {
                  const counted = getCountedQuantity(item);
                  const expected = safeNumber(item.expectedQuantity);
                  const difference = counted - expected;
                  const tags = buildItemTags(item);

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
                          className={`inline-flex w-fit items-center rounded-xl border px-3 py-1 text-sm font-medium ${
                            item.status === 'OK'
                              ? 'border-emerald-900/60 bg-emerald-950/50 text-emerald-400'
                              : item.status === 'ALERTA'
                                ? 'border-yellow-900/60 bg-yellow-950/50 text-yellow-400'
                                : item.status === 'CADUCADO'
                                  ? 'border-orange-900/60 bg-orange-950/50 text-orange-400'
                                  : item.status === 'DAÑADO'
                                    ? 'border-zinc-700 bg-zinc-900 text-zinc-300'
                                    : 'border-red-900/60 bg-red-950/50 text-red-400'
                          }`}
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
                    </div>
                  );
                })
              )}
            </div>

            {filteredItems.length > 80 && (
              <p className="text-sm text-zinc-500">
                Se muestran los primeros 80 resultados. Usa la búsqueda para
                filtrar más.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">
            Historial de inventarios
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Aquí solo aparecen inventarios ya guardados de forma final.
          </p>
        </div>

        <div className="space-y-3">
          {loadingHistory ? (
            <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
              Cargando historial...
            </div>
          ) : allInventories.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
              No hay inventarios guardados todavía.
            </div>
          ) : (
            allInventories.slice(0, 20).map((inv) => (
              <div
                key={inv.id}
                className="rounded-2xl border border-zinc-800 bg-black p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
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

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      to={`/inventario/${inv.id}`}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-2 font-medium text-white transition hover:border-zinc-500"
                    >
                      Ver detalle
                    </Link>

                    <Link
                      to={`/inventario/${inv.id}/editar`}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-blue-700 bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500"
                    >
                      Editar
                    </Link>

                    <button
                      onClick={() => exportInventoryToPDF(inv)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500"
                    >
                      <Download size={16} />
                      Descargar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-yellow-900/60 bg-yellow-950/20 p-5">
        <div className="flex gap-3">
          <AlertTriangle
            className="mt-0.5 shrink-0 text-yellow-400"
            size={20}
          />
          <div className="text-sm leading-7 text-yellow-100">
            Mientras el inventario esté en borrador, los usuarios pueden seguir
            contando y ver cambios en tiempo real. Solo al guardar final pasará
            al historial y quedará listo para descargar.
          </div>
        </div>
      </section>
    </div>
  );
}