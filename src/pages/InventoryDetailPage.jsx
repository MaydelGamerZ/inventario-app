import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getInventoryById,
  updateInventoryBasicData,
  getCategoriesByInventoryId,
  getProductsByCategory,
  importParsedPdfToInventory,
} from '../services/inventory.js';
import { parseInventoryPdf } from '../services/pdfInventoryParser.js';

function formatDate(dateString) {
  if (!dateString) return 'Sin fecha';

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function InventoryDetailPage() {
  const { inventoryId } = useParams();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState(null);
  const [form, setForm] = useState({
    semana: '',
    cedis: '',
    estado: 'abierto',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [products, setProducts] = useState([]);

  const [pdfFile, setPdfFile] = useState(null);
  const [importingPdf, setImportingPdf] = useState(false);
  const [pdfSummary, setPdfSummary] = useState(null);

  async function loadInventory() {
    try {
      setLoading(true);
      setMessage('');

      const data = await getInventoryById(inventoryId);

      if (!data) {
        setInventory(null);
        setMessage('El inventario no existe.');
        return;
      }

      setInventory(data);
      setForm({
        semana: data.semana || '',
        cedis: data.cedis || '',
        estado: data.estado || 'abierto',
      });

      const loadedCategories = await getCategoriesByInventoryId(inventoryId);
      setCategories(loadedCategories);

      if (loadedCategories.length > 0) {
        const firstCategoryId = loadedCategories[0].id;
        setSelectedCategoryId(firstCategoryId);

        const loadedProducts = await getProductsByCategory(
          inventoryId,
          firstCategoryId
        );
        setProducts(loadedProducts);
      } else {
        setSelectedCategoryId('');
        setProducts([]);
      }
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      setInventory(null);
      setMessage('Error al cargar el inventario.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts(categoryId) {
    if (!categoryId) {
      setProducts([]);
      return;
    }

    try {
      const loadedProducts = await getProductsByCategory(
        inventoryId,
        categoryId
      );
      setProducts(loadedProducts);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setMessage('Error al cargar productos.');
    }
  }

  useEffect(() => {
    if (inventoryId) {
      loadInventory();
    }
  }, [inventoryId]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage('');

      await updateInventoryBasicData(inventoryId, {
        semana: form.semana.trim(),
        cedis: form.cedis.trim(),
        estado: form.estado,
      });

      await loadInventory();
      setMessage('Inventario actualizado correctamente.');
    } catch (error) {
      console.error('Error al guardar inventario:', error);
      setMessage('No se pudo actualizar el inventario.');
    } finally {
      setSaving(false);
    }
  }

  function handlePdfChange(e) {
    const file = e.target.files?.[0] || null;
    setPdfFile(file);
    setPdfSummary(null);
  }

  async function handleAnalyzePdf() {
    if (!pdfFile) {
      setMessage('Selecciona un PDF primero.');
      return;
    }

    try {
      setImportingPdf(true);
      setMessage('');

      const parsed = await parseInventoryPdf(pdfFile);
      setPdfSummary(parsed);

      setMessage(
        'PDF analizado correctamente. Revisa el resumen antes de importar.'
      );
    } catch (error) {
      console.error('Error al analizar PDF:', error);
      setMessage('No se pudo leer el PDF.');
    } finally {
      setImportingPdf(false);
    }
  }

  async function handleImportPdf() {
    if (!pdfSummary) {
      setMessage('Primero analiza el PDF.');
      return;
    }

    const confirmed = window.confirm(
      'Esta acción reemplazará las categorías y productos actuales del inventario. ¿Deseas continuar?'
    );

    if (!confirmed) return;

    try {
      setImportingPdf(true);
      setMessage('');

      await importParsedPdfToInventory(inventoryId, pdfSummary);
      setPdfFile(null);
      setPdfSummary(null);

      await loadInventory();
      setMessage('PDF importado correctamente.');
    } catch (error) {
      console.error('Error al importar PDF:', error);
      setMessage(error.message || 'No se pudo importar el PDF.');
    } finally {
      setImportingPdf(false);
    }
  }

  async function handleSelectCategory(categoryId) {
    setSelectedCategoryId(categoryId);
    await loadProducts(categoryId);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
        Cargando inventario...
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-zinc-300">{message}</p>
        <button
          onClick={() => navigate('/inventario-diario')}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 transition"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Detalle del Inventario</h2>
          <p className="mt-2 text-zinc-400">
            Aquí cargaremos el PDF diario para crear categorías y productos.
          </p>
        </div>

        <button
          onClick={() => navigate('/inventario-diario')}
          className="rounded-xl bg-zinc-800 px-5 py-3 font-semibold text-white hover:bg-zinc-700 transition"
        >
          Volver
        </button>
      </header>

      {message && (
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm text-zinc-200">
          {message}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Fecha</p>
          <h3 className="mt-2 text-lg font-semibold">
            {formatDate(inventory.fecha)}
          </h3>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Estado</p>
          <h3 className="mt-2 text-lg font-semibold capitalize">
            {inventory.estado}
          </h3>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Total categorías</p>
          <h3 className="mt-2 text-lg font-semibold">
            {inventory.totalCategorias || 0}
          </h3>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Total productos</p>
          <h3 className="mt-2 text-lg font-semibold">
            {inventory.totalProductos || 0}
          </h3>
        </div>
      </section>

      <section className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-bold">Datos básicos</h3>

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="semana"
                className="mb-2 block text-sm font-medium"
              >
                Semana
              </label>
              <input
                id="semana"
                name="semana"
                type="text"
                value={form.semana}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="cedis" className="mb-2 block text-sm font-medium">
                Cedis
              </label>
              <input
                id="cedis"
                name="cedis"
                type="text"
                value={form.cedis}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="estado"
                className="mb-2 block text-sm font-medium"
              >
                Estado
              </label>
              <select
                id="estado"
                name="estado"
                value={form.estado}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="abierto">abierto</option>
                <option value="cerrado">cerrado</option>
                <option value="archivado">archivado</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-bold">Importar PDF diario</h3>

          <div className="mt-5 space-y-4">
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfChange}
              className="block w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white"
            />

            <button
              type="button"
              onClick={handleAnalyzePdf}
              disabled={!pdfFile || importingPdf}
              className="w-full rounded-xl bg-zinc-700 px-4 py-3 font-semibold text-white hover:bg-zinc-600 transition disabled:opacity-60"
            >
              {importingPdf ? 'Analizando...' : 'Analizar PDF'}
            </button>

            <button
              type="button"
              onClick={handleImportPdf}
              disabled={!pdfSummary || importingPdf}
              className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-500 transition disabled:opacity-60"
            >
              {importingPdf ? 'Importando...' : 'Importar al inventario'}
            </button>
          </div>

          {pdfSummary && (
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-400">Resumen detectado</p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-zinc-500">Semana</p>
                  <p className="font-semibold text-white">
                    {pdfSummary.semana || 'No detectada'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">Cedis</p>
                  <p className="font-semibold text-white">
                    {pdfSummary.cedis || 'No detectado'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">Categorías</p>
                  <p className="font-semibold text-white">
                    {pdfSummary.totalCategorias}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">Productos</p>
                  <p className="font-semibold text-white">
                    {pdfSummary.totalProductos}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-bold">Categorías cargadas</h3>

          <div className="mt-5 space-y-3">
            {categories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                Aún no hay categorías en este inventario.
              </div>
            ) : (
              categories.map((category) => {
                const selected = selectedCategoryId === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelectCategory(category.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? 'border-blue-500 bg-zinc-800'
                        : 'border-zinc-800 bg-zinc-950'
                    }`}
                  >
                    <p className="font-semibold text-white">
                      {category.nombre}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Orden: {category.orden || 0}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-bold">Productos de la categoría</h3>

          {!selectedCategoryId ? (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
              Selecciona una categoría para ver sus productos.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                  No hay productos en esta categoría.
                </div>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <p className="font-semibold text-white">{product.nombre}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Stock esperado: {product.stockEsperado} | No disponible:{' '}
                      {product.noDisponible}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
