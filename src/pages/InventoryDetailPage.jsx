import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  PackagePlus,
  Save,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import {
  getInventoryById,
  getProducts,
  updateInventory,
} from '../services/inventory';

export default function InventoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const [inventoryData, productsData] = await Promise.all([
        getInventoryById(id),
        getProducts(),
      ]);

      if (!inventoryData) {
        setInventory(null);
        return;
      }

      setInventory(inventoryData);
      setProducts(productsData);
      setNotes(inventoryData.notes || '');
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  const availableProducts = useMemo(() => {
    if (!inventory) return products;

    const existingIds = new Set(
      (inventory.items || []).map((item) => item.productId)
    );

    return products.filter((product) => !existingIds.has(product.id));
  }, [products, inventory]);

  const handleAddItem = () => {
    setError('');
    setSuccess('');

    if (!inventory) return;

    if (!selectedProductId) {
      setError('Selecciona un producto.');
      return;
    }

    const numericQuantity = Number(quantity);

    if (!numericQuantity || numericQuantity < 0) {
      setError('Ingresa una cantidad válida.');
      return;
    }

    const selectedProduct = products.find(
      (product) => product.id === selectedProductId
    );

    if (!selectedProduct) {
      setError('El producto seleccionado no es válido.');
      return;
    }

    const newItem = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      categoryId: selectedProduct.categoryId || '',
      categoryName: selectedProduct.categoryName || '',
      presentation: selectedProduct.presentation || '',
      weight: selectedProduct.weight || '',
      sku: selectedProduct.sku || '',
      quantity: numericQuantity,
    };

    setInventory((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));

    setSelectedProductId('');
    setQuantity('');
  };

  const handleRemoveItem = (productId) => {
    setError('');
    setSuccess('');

    setInventory((prev) => ({
      ...prev,
      items: (prev.items || []).filter((item) => item.productId !== productId),
    }));
  };

  const handleItemQuantityChange = (productId, value) => {
    const numericValue = value === '' ? '' : Number(value);

    setInventory((prev) => ({
      ...prev,
      items: (prev.items || []).map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: numericValue,
            }
          : item
      ),
    }));
  };

  const handleHeaderChange = (field, value) => {
    setInventory((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!inventory) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const sanitizedItems = (inventory.items || []).map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
      }));

      await updateInventory(inventory.id, {
        date: inventory.date || '',
        dateKey: inventory.dateKey || '',
        status: inventory.status || 'Abierto',
        cedis: inventory.cedis || '',
        week: inventory.week || '',
        items: sanitizedItems,
        notes: notes.trim(),
      });

      setSuccess('Inventario actualizado correctamente.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar el inventario.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-300">
        Cargando inventario...
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-2xl font-bold text-white">
            Inventario no encontrado
          </h1>
          <p className="mt-2 text-zinc-400">
            El inventario que intentaste abrir no existe o fue eliminado.
          </p>

          <div className="mt-5">
            <Link
              to="/inventario-diario"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              <ArrowLeft size={18} />
              Volver
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <button
                onClick={() => navigate('/inventario-diario')}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-zinc-200 transition hover:border-zinc-700"
              >
                <ArrowLeft size={18} />
              </button>

              <div>
                <p className="text-sm font-medium text-blue-400">
                  Detalle de inventario
                </p>
                <h1 className="text-3xl font-bold text-white">
                  Inventario del día
                </h1>
              </div>
            </div>

            <p className="text-sm leading-7 text-zinc-400">
              Aquí puedes editar el inventario, agregar productos, cambiar
              cantidades y guardar los cambios.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
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

      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <label className="mb-2 block text-sm text-zinc-400">Fecha</label>
          <input
            type="text"
            value={inventory.date || ''}
            onChange={(e) => handleHeaderChange('date', e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <label className="mb-2 block text-sm text-zinc-400">Estado</label>
          <select
            value={inventory.status || 'Abierto'}
            onChange={(e) => handleHeaderChange('status', e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
          >
            <option value="Abierto">Abierto</option>
            <option value="Cerrado">Cerrado</option>
          </select>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <label className="mb-2 block text-sm text-zinc-400">Cedis</label>
          <input
            type="text"
            value={inventory.cedis || ''}
            onChange={(e) => handleHeaderChange('cedis', e.target.value)}
            placeholder="Ej. Mazatlán"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <label className="mb-2 block text-sm text-zinc-400">Semana</label>
          <input
            type="text"
            value={inventory.week || ''}
            onChange={(e) => handleHeaderChange('week', e.target.value)}
            placeholder="Ej. Semana 15"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-blue-400">
            <PackagePlus size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Agregar producto</h2>
            <p className="text-sm text-zinc-400">
              Selecciona un producto del catálogo y asigna su cantidad.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.5fr_auto]">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
          >
            <option value="">Selecciona un producto</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} {product.weight ? `- ${product.weight}` : ''}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Cantidad"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />

          <button
            onClick={handleAddItem}
            className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            Agregar
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-emerald-400">
            <ClipboardList size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Productos del inventario
            </h2>
            <p className="text-sm text-zinc-400">
              Total registrados: {(inventory.items || []).length}
            </p>
          </div>
        </div>

        {(inventory.items || []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-black px-4 py-6 text-sm text-zinc-400">
            Este inventario todavía no tiene productos agregados.
          </div>
        ) : (
          <div className="space-y-3">
            {(inventory.items || []).map((item) => (
              <div
                key={item.productId}
                className="rounded-2xl border border-zinc-800 bg-black p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-blue-400">
                      {item.categoryName || 'Sin categoría'}
                    </p>

                    <div className="mt-3 grid gap-2 text-sm text-zinc-400 sm:grid-cols-3">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                        <span className="block text-xs text-zinc-500">
                          Presentación
                        </span>
                        <span className="text-zinc-300">
                          {item.presentation || '—'}
                        </span>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                        <span className="block text-xs text-zinc-500">
                          Peso
                        </span>
                        <span className="text-zinc-300">
                          {item.weight || '—'}
                        </span>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                        <span className="block text-xs text-zinc-500">SKU</span>
                        <span className="text-zinc-300">{item.sku || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:w-[180px]">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemQuantityChange(item.productId, e.target.value)
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                    />

                    <button
                      onClick={() => handleRemoveItem(item.productId)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 font-medium text-red-300 transition hover:bg-red-900/40"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="text-xl font-bold text-white">Notas</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Aquí puedes guardar observaciones del inventario.
        </p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Escribe observaciones, incidencias o comentarios..."
          className="mt-4 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
        />
      </section>
    </div>
  );
}
