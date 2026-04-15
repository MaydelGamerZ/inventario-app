import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Boxes,
  Package,
  CalendarDays,
  Building2,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseInventoryPdf } from '../services/pdfInventoryParser';
import {
  getAllInventories,
  saveDailyInventoryFromPdf,
} from '../services/inventory';

export default function ProductsPage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [inventories, setInventories] = useState([]);
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadInventories() {
    try {
      setLoading(true);
      const data = await getAllInventories();
      setInventories(data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el historial de inventarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventories();
  }, []);

  const filteredItems = useMemo(() => {
    const items = preview?.items || [];
    const term = search.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) => {
      return (
        item.productName?.toLowerCase().includes(term) ||
        item.categoryName?.toLowerCase().includes(term) ||
        item.supplierName?.toLowerCase().includes(term)
      );
    });
  }, [preview, search]);

  const handleOpenPicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setProcessing(true);
    setError('');
    setSuccess('');
    setPreview(null);

    try {
      const parsed = await parseInventoryPdf(selectedFile);
      setPreview(parsed);
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo procesar el PDF.');
    } finally {
      setProcessing(false);
      event.target.value = '';
    }
  };

  const handleSaveInventory = async () => {
    if (!preview) {
      setError('Primero debes subir y procesar un PDF.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await saveDailyInventoryFromPdf(preview, user?.email || '');
      setSuccess(
        `Inventario base del ${preview.dateLabel} guardado correctamente.`
      );
      await loadInventories();
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo guardar el inventario.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-sm font-medium text-blue-400">Base del sistema</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Productos y categorías
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400 sm:text-base">
          Aquí se sube el PDF oficial del inventario. El sistema detecta
          categorías, productos, stock y no disponible, y guarda el inventario
          base del día en Firestore.
        </p>
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

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Subir inventario base
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Sube el PDF del día. Si ya existe ese inventario por fecha, se
              actualizará.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleOpenPicker}
              disabled={processing || saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-black px-5 py-3 font-semibold text-white transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={18} />
              {processing ? 'Procesando...' : 'Seleccionar PDF'}
            </button>

            <button
              onClick={handleSaveInventory}
              disabled={!preview || processing || saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 size={18} />
              {saving ? 'Guardando...' : 'Guardar inventario base'}
            </button>
          </div>
        </div>
      </section>

      {preview && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-blue-400">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Fecha</p>
                  <h2 className="mt-2 text-xl font-bold text-white">
                    {preview.dateLabel || 'Sin fecha'}
                  </h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-300">
                  <FileText size={22} />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Semana</p>
                  <h2 className="mt-2 text-xl font-bold text-white">
                    {preview.week || '—'}
                  </h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-yellow-400">
                  <Building2 size={22} />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Cedis</p>
                  <h2 className="mt-2 text-xl font-bold text-white">
                    {preview.cedis || '—'}
                  </h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-emerald-400">
                  <Boxes size={22} />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Categorías</p>
                  <h2 className="mt-2 text-xl font-bold text-white">
                    {preview.categories?.length || 0}
                  </h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-orange-400">
                  <Package size={22} />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Productos</p>
                  <h2 className="mt-2 text-xl font-bold text-white">
                    {preview.items?.length || 0}
                  </h2>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white">
                Vista previa del PDF
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Así quedará el inventario base antes de guardarse.
              </p>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
              <Search size={18} className="text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto, categoría o proveedor..."
                className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-4">
              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
                  No hay resultados para esa búsqueda.
                </div>
              ) : (
                preview.categories.map((category) => {
                  const categoryItems = filteredItems.filter(
                    (item) =>
                      item.categoryCode === category.categoryCode &&
                      item.supplierCode === category.supplierCode
                  );

                  if (categoryItems.length === 0) return null;

                  return (
                    <div
                      key={`${category.supplierCode}-${category.categoryCode}`}
                    >
                      <div className="rounded-t-2xl border border-zinc-700 bg-zinc-300 px-4 py-3 text-sm font-bold text-black">
                        {category.supplierCode} - {category.supplierName} -{' '}
                        {category.categoryCode} - {category.categoryName}
                      </div>

                      <div className="rounded-b-2xl border border-t-0 border-zinc-800 bg-black">
                        {categoryItems.map((item, index) => (
                          <div
                            key={`${item.productName}-${index}`}
                            className="grid gap-3 border-b border-zinc-900 px-4 py-4 last:border-b-0 md:grid-cols-[1.6fr_0.5fr_0.5fr]"
                          >
                            <div>
                              <p className="font-semibold text-white">
                                {item.productName}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {item.supplierName}
                              </p>
                            </div>

                            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                              <span className="block text-xs text-zinc-500">
                                Stock
                              </span>
                              <span className="text-zinc-200">
                                {Number(
                                  item.expectedQuantity || 0
                                ).toLocaleString('es-MX')}
                              </span>
                            </div>

                            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                              <span className="block text-xs text-zinc-500">
                                No disponible
                              </span>
                              <span className="text-zinc-200">
                                {Number(
                                  item.unavailableQuantity || 0
                                ).toLocaleString('es-MX')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">
            Inventarios guardados
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Historial base cargado desde PDF.
          </p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
              Cargando inventarios...
            </div>
          ) : inventories.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-6 text-zinc-400">
              No hay inventarios guardados todavía.
            </div>
          ) : (
            inventories.slice(0, 20).map((inventory) => (
              <div
                key={inventory.id}
                className="rounded-2xl border border-zinc-800 bg-black p-4"
              >
                <p className="font-semibold text-white">
                  {inventory.date || 'Sin fecha'}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Semana {inventory.week || '—'} ·{' '}
                  {inventory.cedis || 'Sin cedis'}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {inventory.items?.length || 0} productos ·{' '}
                  {inventory.categories?.length || 0} categorías
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
