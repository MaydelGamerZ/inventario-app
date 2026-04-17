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
  ExternalLink,
  Copy,
  Smartphone,
  ChevronDown,
  ChevronUp,
  X,
  FolderOpen,
  RefreshCw,
  FileText,
  Building2,
  Hash,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseInventoryPdf } from '../services/pdfInventoryParser';
import {
  reopenInventoryDraft,
  saveDailyInventoryFromPdf,
  subscribeInventoryByDate,
  subscribeAllInventories,
  startInventoryCount,
} from '../services/inventory';
import InventoryControlsMenu from '../components/InventoryControlsMenu';
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
  const parsed = Number(
    String(value ?? '')
      .replace(/,/g, '')
      .trim()
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
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
      cleanText(entry?.observationType || 'Buen estado') || 'Buen estado';

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

function getItemStatusClasses(status) {
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

function getInventoryStatusLabel(inventory) {
  if (!inventory) return 'Sin inventario';
  if (inventory.status === 'GUARDADO') return 'Guardado';
  if (inventory.countingStarted) return 'Conteo en proceso';
  return 'Cargado';
}

function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;

  try {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches
    );
  } catch {
    return false;
  }
}

function isLegacyNavigatorStandalone() {
  if (typeof navigator === 'undefined') return false;
  return typeof navigator.standalone === 'boolean' && navigator.standalone;
}

function isAppleMobileDevice() {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const isiPhoneOrIPad =
    /iPhone|iPad|iPod/i.test(ua) || /iPhone|iPad|iPod/i.test(platform);

  const isModernIPadOnMac = /Mac/i.test(platform) && maxTouchPoints > 1;

  return isiPhoneOrIPad || isModernIPadOnMac;
}

function isIosStandalone() {
  return (
    isAppleMobileDevice() &&
    (isStandaloneDisplayMode() || isLegacyNavigatorStandalone())
  );
}

function isProbablyPdf(file) {
  if (!file) return false;

  const name = String(file.name || '').toLowerCase();
  const type = String(file.type || '').toLowerCase();

  return type === 'application/pdf' || name.endsWith('.pdf');
}

async function copyTextToClipboard(text) {
  if (!text) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

function sortItems(items = [], sortMode = 'pdf-order') {
  const list = Array.isArray(items) ? [...items] : [];

  if (sortMode === 'pdf-order') {
    return list.sort(
      (a, b) => safeNumber(a?.itemOrder) - safeNumber(b?.itemOrder)
    );
  }

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

function groupItemsByCategory(items = [], sortMode = 'pdf-order') {
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
        categoryOrder: safeNumber(item?.categoryOrder),
        firstItemOrder: safeNumber(item?.itemOrder),
        items: [],
      });
    }

    const group = map.get(groupId);
    group.items.push(item);
    group.categoryOrder = Math.min(
      group.categoryOrder,
      safeNumber(item?.categoryOrder)
    );
    group.firstItemOrder = Math.min(
      group.firstItemOrder,
      safeNumber(item?.itemOrder)
    );
  }

  const groups = Array.from(map.values()).map((group) => {
    const sortedItems = sortItems(group.items, sortMode);
    const totalExpected = sortedItems.reduce(
      (sum, item) => sum + safeNumber(item?.expectedQuantity),
      0
    );
    const totalCounted = sortedItems.reduce(
      (sum, item) => sum + getCountedQuantity(item),
      0
    );

    return {
      ...group,
      items: sortedItems,
      totalProducts: sortedItems.length,
      totalExpected,
      totalCounted,
    };
  });

  if (sortMode === 'pdf-order') {
    return groups.sort((a, b) => {
      if (a.categoryOrder !== b.categoryOrder) {
        return a.categoryOrder - b.categoryOrder;
      }

      return a.firstItemOrder - b.firstItemOrder;
    });
  }

  return groups.sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  iconClassName = 'text-zinc-300',
}) {
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
  { value: 'pdf-order', label: 'Ordenar: orden del PDF' },
  { value: 'counted-first', label: 'Ordenar: contados primero' },
  { value: 'difference', label: 'Ordenar: mayor diferencia' },
  { value: 'name', label: 'Ordenar: nombre' },
];

export default function InventoryDayPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const previousStatusRef = useRef('');
  const uploadInputRef = useRef(null);

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
  const [reopeningCount, setReopeningCount] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [iosUploadHelp, setIosUploadHelp] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [sortMode, setSortMode] = useState('pdf-order');
  const [showOnlyCounted, setShowOnlyCounted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const showIosStandaloneHelp = isIosStandalone();

  useEffect(() => {
    setLoadingToday(true);
    setLoadingHistory(true);

    const unsubscribeToday = subscribeInventoryByDate(todayDateKey, (inv) => {
      setTodayInventory(inv || null);
      setLoadingToday(false);
    });

    const unsubscribeAll = subscribeAllInventories((list) => {
      const onlySaved = Array.isArray(list)
        ? list.filter((inv) => inv?.status === 'GUARDADO')
        : [];

      setAllInventories(onlySaved);
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
    const items = Array.isArray(todayInventory?.items)
      ? todayInventory.items
      : [];
    const term = cleanText(search).toLowerCase();

    const result = items.filter((item) => {
      const counted = getCountedQuantity(item);
      const expected = safeNumber(item?.expectedQuantity);
      const difference = counted - expected;

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
            entry?.createdByEmail || entry?.createdBy || '',
          ]
            .join(' ')
            .toLowerCase()
        )
        .join(' ');

      const searchable = [
        item?.productName || '',
        item?.categoryName || '',
        item?.categoryRaw || '',
        item?.supplierName || '',
        item?.status || '',
        observationLabels,
        entriesText,
        String(expected),
        String(counted),
        String(difference),
      ]
        .join(' ')
        .toLowerCase();

      if (showOnlyCounted && !hasAnyCount(item)) {
        return false;
      }

      if (!term) return true;

      return searchable.includes(term);
    });

    return result;
  }, [todayInventory, search, showOnlyCounted]);

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

  const stats = useMemo(() => {
    const items = Array.isArray(todayInventory?.items)
      ? todayInventory.items
      : [];

    return {
      totalProducts: items.length,
      totalCategories:
        todayInventory?.categories?.length ||
        groupItemsByCategory(items).length ||
        0,
      ok: items.filter((i) => i.status === 'OK').length,
      alerta: items.filter((i) => i.status === 'ALERTA').length,
      faltante: items.filter((i) => i.status === 'FALTANTE').length,
      totalStockEsperado: items.reduce(
        (sum, item) => sum + safeNumber(item?.expectedQuantity),
        0
      ),
      totalNoDisponible: items.reduce(
        (sum, item) => sum + safeNumber(item?.unavailableQuantity),
        0
      ),
      totalCountedProducts: items.filter((item) => hasAnyCount(item)).length,
      totalConteoFisico: items.reduce(
        (sum, item) => sum + getCountedQuantity(item),
        0
      ),
    };
  }, [todayInventory]);

  const canDownload = todayInventory?.status === 'GUARDADO';
  const isDraft = todayInventory?.status === 'BORRADOR';
  const hasInventory = !!todayInventory;
  const isCountStarted = Boolean(todayInventory?.countingStarted);

  const resetMessages = () => {
    setError('');
    setSuccess('');
    setSaveNotice('');
    setCopySuccess('');
  };

  const clearFileInput = () => {
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  const processSelectedFile = async (selectedFile) => {
    if (!selectedFile) return;

    resetMessages();
    setIosUploadHelp(false);
    setSelectedFileName(selectedFile.name || '');
    setUploading(true);

    try {
      if (!isProbablyPdf(selectedFile)) {
        throw new Error('El archivo seleccionado no parece ser un PDF válido.');
      }

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

      const normalizedMessage = rawMessage.toLowerCase();

      if (
        normalizedMessage.includes('undefined is not a function') ||
        normalizedMessage.includes('not a function') ||
        normalizedMessage.includes('failed to fetch') ||
        normalizedMessage.includes('load failed') ||
        normalizedMessage.includes('the operation is not supported') ||
        normalizedMessage.includes('webkit') ||
        normalizedMessage.includes('safari')
      ) {
        setError(
          'Este iPhone tuvo un problema al leer el PDF desde la app instalada. Intenta abrir esta misma página en Safari normal y volver a seleccionar el archivo.'
        );
        setIosUploadHelp(true);
      } else {
        setError(rawMessage);
      }
    } finally {
      setUploading(false);
      clearFileInput();
    }
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    await processSelectedFile(selectedFile);
  };

  const handleUploadButtonClick = () => {
    resetMessages();

    if (showIosStandaloneHelp) {
      setIosUploadHelp(true);
    }

    uploadInputRef.current?.click();
  };

  const handleInputPointerDown = () => {
    resetMessages();

    if (showIosStandaloneHelp) {
      setIosUploadHelp(true);
    }
  };

  const handleOpenInBrowser = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = window.location.href;
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(window.location.href);

    if (ok) {
      setCopySuccess('Enlace copiado. Ábrelo en Safari normal.');
    } else {
      setCopySuccess('No se pudo copiar el enlace automáticamente.');
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

  const handleReopenCount = async () => {
    if (!todayInventory?.id) return;

    try {
      setReopeningCount(true);
      resetMessages();

      await reopenInventoryDraft(todayInventory.id);
      navigate(`/inventario/${todayInventory.id}/editar`);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'No se pudo reingresar al conteo.');
    } finally {
      setReopeningCount(false);
    }
  };

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
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-300">
              <FileText size={14} />
              Flujo diario
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Inventario Diario
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-400 sm:text-base">
              Aquí subes el PDF oficial del día, se crea el inventario base y
              luego continúas con el conteo físico por producto.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
            <p className="text-zinc-500">Fecha activa</p>
            <p className="mt-1 font-semibold text-white">{todayLabel}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050505] p-4 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-white">
              Importar PDF del día
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Desde aquí cargas o reemplazas el PDF oficial del inventario
              diario.
            </p>
          </div>

          {hasInventory && (
            <div className="inline-flex items-center rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300">
              Inventario cargado para hoy
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[26px] border border-dashed border-white/10 bg-black p-4 sm:p-5">
            <input
              ref={uploadInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              onPointerDown={handleInputPointerDown}
              onTouchStart={handleInputPointerDown}
              className="sr-only"
              aria-label="Seleccionar PDF del inventario"
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-400">
                  {uploading ? (
                    <Loader2 size={22} className="animate-spin" />
                  ) : (
                    <FileUp size={22} />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">
                    {uploading
                      ? 'Procesando PDF...'
                      : 'Sube el archivo oficial'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Compatible con PDF. Úsalo para crear o reemplazar el
                    inventario base.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleUploadButtonClick}
                  disabled={uploading}
                  className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 ${
                    uploading ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  <Upload size={18} />
                  {hasInventory ? 'Reemplazar PDF' : 'Subir PDF'}
                </button>

                <button
                  type="button"
                  onClick={handleUploadButtonClick}
                  disabled={uploading}
                  className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.06] ${
                    uploading ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  <FolderOpen size={18} />
                  Elegir archivo
                </button>
              </div>
            </div>

            {selectedFileName && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Archivo seleccionado
                </p>
                <p className="mt-2 break-all text-sm font-medium text-white">
                  {selectedFileName}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <h3 className="text-base font-semibold text-white">
              Estado del PDF
            </h3>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Fecha requerida
                </p>
                <p className="mt-1 font-semibold text-white">{todayLabel}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Inventario actual
                </p>
                <p className="mt-1 font-semibold text-white">
                  {loadingToday
                    ? 'Cargando...'
                    : getInventoryStatusLabel(todayInventory)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Acción recomendada
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  {hasInventory
                    ? 'Puedes reemplazar el PDF si necesitas actualizar el inventario base.'
                    : 'Sube el PDF oficial para crear el inventario del día.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showIosStandaloneHelp && (
        <section className="rounded-2xl border border-yellow-900/60 bg-yellow-950/20 px-4 py-4 text-sm text-yellow-100">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 shrink-0 text-yellow-400" size={18} />
            <div className="space-y-3">
              <p>
                En iPhone como app web, la selección de archivos puede fallar.
                Si no abre el selector o no lee el PDF, usa esta misma página en
                Safari normal.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleOpenInBrowser}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-yellow-700 bg-yellow-500/10 px-4 py-2 font-medium text-yellow-100 transition hover:bg-yellow-500/20"
                >
                  <ExternalLink size={16} />
                  Abrir en navegador
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 font-medium text-white transition hover:bg-white/[0.06]"
                >
                  <Copy size={16} />
                  Copiar enlace
                </button>
              </div>

              {copySuccess && (
                <p className="text-xs text-yellow-200">{copySuccess}</p>
              )}

              {iosUploadHelp && (
                <p className="text-xs text-yellow-200">
                  Consejo: en iPhone, abre el enlace en Safari normal y sube el
                  PDF desde ahí.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {error && (
        <section className="rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </section>
      )}

      {success && (
        <section className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        </section>
      )}

      {saveNotice && (
        <section className="rounded-2xl border border-blue-900/60 bg-blue-950/30 px-4 py-3 text-sm text-blue-200">
          <div className="flex items-start gap-2">
            <Bell size={18} className="mt-0.5 shrink-0" />
            <span>{saveNotice}</span>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          title="Hoy"
          value={todayLabel}
          iconClassName="text-blue-400"
        />
        <StatCard
          icon={ClipboardList}
          title="Inventario de hoy"
          value={
            loadingToday
              ? 'Cargando...'
              : getInventoryStatusLabel(todayInventory)
          }
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
          title="Usuario actual"
          value={user?.email || 'Sin usuario'}
          iconClassName="text-zinc-300"
        />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050505] p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Inventario activo del día
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Primero cargas el PDF. Después puedes iniciar el conteo,
              continuarlo o descargarlo cuando ya esté guardado.
            </p>
          </div>

          {hasInventory && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {!isCountStarted && (
                <button
                  onClick={handleStartCount}
                  disabled={startingCount}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
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
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  <Pencil size={18} />
                  Continuar conteo
                </Link>
              )}

              {todayInventory?.status === 'GUARDADO' && (
                <button
                  type="button"
                  onClick={handleReopenCount}
                  disabled={reopeningCount}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {reopeningCount ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Pencil size={18} />
                  )}
                  {reopeningCount ? 'Reabriendo...' : 'Reingresar al conteo'}
                </button>
              )}

              {todayInventory?.status === 'GUARDADO' && (
                <Link
                  to={`/inventario/${todayInventory.id}`}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
                >
                  Ver detalle
                </Link>
              )}

              {canDownload && (
                <button
                  onClick={() => exportInventoryToPDF(todayInventory)}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  <Download size={18} />
                  Descargar
                </button>
              )}

              <button
                type="button"
                onClick={handleUploadButtonClick}
                disabled={uploading}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06] disabled:opacity-60"
              >
                <RefreshCw size={18} />
                Reemplazar PDF
              </button>
            </div>
          )}
        </div>

        {loadingToday ? (
          <div className="rounded-2xl border border-white/10 bg-black px-4 py-6 text-zinc-400">
            Cargando inventario...
          </div>
        ) : !todayInventory ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black px-4 py-6 text-zinc-400">
            Aún no has subido el PDF del inventario de hoy.
          </div>
        ) : (
          <div className="space-y-4">
            <section className="sticky top-[calc(56px+env(safe-area-inset-top)+8px)] z-30 lg:top-4">
              <div className="rounded-2xl border border-white/10 bg-black/95 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Search size={18} className="shrink-0 text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar producto, categorÃ­a, proveedor, observaciÃ³n o cantidad..."
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
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <CalendarDays size={16} />
                  <p className="text-sm">Fecha</p>
                </div>
                <p className="mt-2 font-semibold text-white">
                  {getInventoryDateLabel(todayInventory)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Hash size={16} />
                  <p className="text-sm">Semana</p>
                </div>
                <p className="mt-2 font-semibold text-white">
                  {todayInventory.week || 'Sin semana'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Building2 size={16} />
                  <p className="text-sm">CEDIS</p>
                </div>
                <p className="mt-2 break-words font-semibold text-white">
                  {todayInventory.cedis || 'Sin cedis'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <p className="text-sm text-zinc-400">Productos</p>
                <p className="mt-2 font-semibold text-white">
                  {stats.totalProducts}
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
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4">
                <p className="text-sm text-emerald-300">OK</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {stats.ok}
                </p>
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

              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <p className="text-sm text-zinc-400">Productos contados</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {stats.totalCountedProducts}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <p className="text-sm text-zinc-400">Conteo físico total</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {stats.totalConteoFisico.toLocaleString('es-MX')}
                </p>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-black p-4">
              <div className="hidden">
                <div className="flex items-center gap-3 px-4 py-3">
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
              </div>

              <div className="flex justify-end">
                <div className="w-full sm:w-auto">
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
                  <p className="text-sm text-zinc-400">Búsqueda activa</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {search ? 'Sí' : 'No'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
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
                            {group.totalExpected.toLocaleString('es-MX')} •
                            Contado:{' '}
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
                          <div className="space-y-3">
                            {group.items.map((item, index) => {
                              const counted = getCountedQuantity(item);
                              const expected = safeNumber(
                                item.expectedQuantity
                              );
                              const difference = counted - expected;
                              const tags = buildItemTags(item);
                              const countEntries = getCountEntries(item);

                              return (
                                <div
                                  key={`${group.id}-${item.productName || 'producto'}-${index}`}
                                  className="rounded-[24px] border border-white/10 bg-[#050505] p-4"
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
                                              key={`${item.productName}-${tag.label}-${tagIndex}`}
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
                                      className={`inline-flex w-fit items-center rounded-xl border px-3 py-1 text-sm font-medium ${getItemStatusClasses(
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
                                        {safeNumber(
                                          item.unavailableQuantity
                                        ).toLocaleString('es-MX')}
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
                                          ? Math.abs(difference).toLocaleString(
                                              'es-MX'
                                            )
                                          : '0'}
                                      </span>
                                    </div>
                                  </div>

                                  {countEntries.length > 0 && (
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black p-3">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                        Historial de conteos
                                      </p>

                                      <div className="mt-3 space-y-2">
                                        {countEntries.map(
                                          (entry, entryIndex) => (
                                            <div
                                              key={`${item.productName}-entry-${entryIndex}`}
                                              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                                            >
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                  className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${getTagClasses(
                                                    entry?.observationType ||
                                                      'Buen estado'
                                                  )}`}
                                                >
                                                  {cleanText(
                                                    entry?.observationType ||
                                                      'Buen estado'
                                                  )}
                                                </span>

                                                <span className="text-sm font-semibold text-white">
                                                  {safeNumber(
                                                    entry?.quantity
                                                  ).toLocaleString('es-MX')}
                                                </span>
                                              </div>

                                              {cleanText(entry?.comment) && (
                                                <p className="mt-2 text-sm text-zinc-300">
                                                  {cleanText(entry.comment)}
                                                </p>
                                              )}

                                              {(cleanText(
                                                entry?.createdByEmail
                                              ) ||
                                                cleanText(entry?.createdBy) ||
                                                cleanText(
                                                  entry?.createdAtLabel
                                                ) ||
                                                cleanText(
                                                  entry?.createdAt
                                                )) && (
                                                <p className="mt-2 text-xs text-zinc-500">
                                                  {cleanText(
                                                    entry?.createdByEmail ||
                                                      entry?.createdBy ||
                                                      'Sin usuario'
                                                  )}
                                                  {cleanText(
                                                    entry?.createdAtLabel ||
                                                      entry?.createdAt
                                                  )
                                                    ? ` · ${cleanText(
                                                        entry?.createdAtLabel ||
                                                          entry?.createdAt
                                                      )}`
                                                    : ''}
                                                </p>
                                              )}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
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
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050505] p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-white">
            Historial de inventarios
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Aquí solo aparecen inventarios ya guardados de forma final.
          </p>
        </div>

        <div className="space-y-3">
          {loadingHistory ? (
            <div className="rounded-2xl border border-white/10 bg-black px-4 py-6 text-zinc-400">
              Cargando historial...
            </div>
          ) : allInventories.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black px-4 py-6 text-zinc-400">
              No hay inventarios guardados todavía.
            </div>
          ) : (
            allInventories.slice(0, 20).map((inv) => (
              <div
                key={inv.id}
                className="rounded-2xl border border-white/10 bg-black p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">
                      {getInventoryDateLabel(inv)}
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
                      className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
                    >
                      Ver detalle
                    </Link>

                    <button
                      onClick={() => exportInventoryToPDF(inv)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
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

      <section className="rounded-[28px] border border-yellow-900/60 bg-yellow-950/20 p-4 sm:p-5">
        <div className="flex gap-3">
          <AlertTriangle
            className="mt-0.5 shrink-0 text-yellow-400"
            size={20}
          />
          <div className="text-sm leading-6 text-yellow-100">
            Mientras el inventario esté en borrador, los usuarios pueden seguir
            contando y ver cambios en tiempo real. Solo al guardar final pasará
            al historial y quedará listo para descargar.
          </div>
        </div>
      </section>
    </div>
  );
}
