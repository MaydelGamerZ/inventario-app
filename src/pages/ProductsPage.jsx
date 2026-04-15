import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  AlertCircle,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { db } from '../firebase';
import { getInventoryByDate, updateInventory } from '../services/inventory';

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeStock(value) {
  const cleaned = String(value ?? '')
    .replace(/[^\d.-]/g, '')
    .trim();
  const number = Number(cleaned);
  if (Number.isNaN(number) || number < 0) return 0;
  return Math.floor(number);
}

export default function ProductsPage() {
  const todayKey = getTodayKey();

  const [inventoryId, setInventoryId] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRowId, setSavingRowId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    stock: '',
  });

  useEffect(() => {
    loadTodayInventory();
  }, []);

  async function loadTodayInventory() {
    setLoading(true);
    setPageError('');
    setPageSuccess('');
    try {
      const inv = await getInventoryByDate(todayKey);
      if (!inv) {
        setInventoryId(null);
        setInventoryData(null);
        setProducts([]);
      } else {
        setInventoryId(inv.id);
        setInventoryData(inv);
        // Convert each item to a product row (we use the index as itemIndex)
        const mapped = inv.items.map((item, idx) => ({
          id: idx, // for React key
          itemIndex: idx,
          name: item.productName || '',
          category: item.categoryName || '',
          stock: item.expectedQuantity ?? 0,
          isDirty: false,
        }));
        setProducts(mapped);
      }
    } catch (error) {
      console.error(error);
      setPageError('No se pudo cargar el inventario del día.');
    } finally {
      setLoading(false);
    }
  }

  function updateLocalField(id, field, value) {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'stock' ? value : value,
              isDirty: true,
            }
          : item
      )
    );
  }

  async function saveRow(product) {
    setPageError('');
    setPageSuccess('');

    const cleanName = normalizeText(product.name);
    const cleanCategory = normalizeText(product.category);
    const cleanStock = normalizeStock(product.stock);

    if (!cleanName) {
      setPageError('Cada producto debe tener nombre.');
      return;
    }

    if (!cleanCategory) {
      setPageError('Cada producto debe tener categoría.');
      return;
    }

    if (!inventoryId || !inventoryData) {
      setPageError('No se ha cargado un inventario válido.');
      return;
    }

    try {
      setSavingRowId(product.id);
      const updatedItems = [...inventoryData.items];

      // Actualiza el item existente según su índice, o lo crea
      if (
        product.itemIndex !== undefined &&
        product.itemIndex < updatedItems.length
      ) {
        const original = updatedItems[product.itemIndex];
        updatedItems[product.itemIndex] = {
          ...original,
          productName: cleanName,
          categoryName: cleanCategory,
          expectedQuantity: cleanStock,
          // Recalcula el status (opcional)
          status:
            cleanStock <= 0
              ? 'FALTANTE'
              : original.unavailableQuantity > 0
                ? 'ALERTA'
                : 'OK',
        };
      } else {
        updatedItems.push({
          productName: cleanName,
          categoryName: cleanCategory,
          categoryCode: '',
          categoryRaw: '',
          supplierName: '',
          supplierCode: '',
          expectedQuantity: cleanStock,
          unavailableQuantity: 0,
          countedQuantity: '',
          total: '',
          difference: '',
          observation: '',
          status: cleanStock <= 0 ? 'FALTANTE' : 'OK',
        });
      }

      const updatedInv = {
        ...inventoryData,
        items: updatedItems,
        // mantén categories y demás campos sin cambios
      };

      await updateInventory(inventoryId, updatedInv);

      // Refleja los cambios en el estado local
      setInventoryData(updatedInv);
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                name: cleanName,
                category: cleanCategory,
                stock: cleanStock,
                isDirty: false,
                itemIndex:
                  product.itemIndex !== undefined
                    ? product.itemIndex
                    : updatedItems.length - 1,
              }
            : item
        )
      );

      setPageSuccess('Producto actualizado correctamente.');
    } catch (error) {
      console.error(error);
      setPageError('No se pudo guardar el producto.');
    } finally {
      setSavingRowId(null);
    }
  }

  async function addProduct() {
    setPageError('');
    setPageSuccess('');

    const cleanName = normalizeText(newProduct.name);
    const cleanCategory = normalizeText(newProduct.category);
    const cleanStock = normalizeStock(newProduct.stock);

    if (!cleanName) {
      setPageError('Escribe el nombre del producto.');
      return;
    }

    if (!cleanCategory) {
      setPageError('Escribe la categoría del producto.');
      return;
    }

    if (!inventoryId || !inventoryData) {
      setPageError('No se ha cargado un inventario válido.');
      return;
    }

    try {
      const newItem = {
        productName: cleanName,
        categoryName: cleanCategory,
        categoryCode: '',
        categoryRaw: '',
        supplierName: '',
        supplierCode: '',
        expectedQuantity: cleanStock,
        unavailableQuantity: 0,
        countedQuantity: '',
        total: '',
        difference: '',
        observation: '',
        status: cleanStock <= 0 ? 'FALTANTE' : 'OK',
      };

      const updatedItems = [...inventoryData.items, newItem];
      const updatedInv = { ...inventoryData, items: updatedItems };

      await updateInventory(inventoryId, updatedInv);

      setInventoryData(updatedInv);

      const localId =
        crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      setProducts((prev) => [
        {
          id: localId,
          itemIndex: updatedItems.length - 1,
          name: cleanName,
          category: cleanCategory,
          stock: cleanStock,
          isDirty: false,
        },
        ...prev,
      ]);

      setNewProduct({
        name: '',
        category: '',
        stock: '',
      });

      setPageSuccess('Producto agregado correctamente.');
    } catch (error) {
      console.error(error);
      setPageError('No se pudo agregar el producto.');
    }
  }

  async function removeProduct(productId) {
    setPageError('');
    setPageSuccess('');

    const confirmed = window.confirm(
      '¿Seguro que quieres quitar este producto del inventario del día?'
    );

    if (!confirmed) return;

    if (!inventoryId || !inventoryData) {
      setPageError('No se ha cargado un inventario válido.');
      return;
    }

    try {
      setDeletingRowId(productId);
      const item = products.find((p) => p.id === productId);
      if (!item) {
        setPageError('Producto no encontrado.');
        return;
      }

      const idx = item.itemIndex;

      const updatedItems = inventoryData.items.filter(
        (_, index) => index !== idx
      );

      const updatedInv = { ...inventoryData, items: updatedItems };

      await updateInventory(inventoryId, updatedInv);

      setInventoryData(updatedInv);

      setProducts((prev) =>
        prev
          .filter((p) => p.id !== productId)
          .map((p) => ({
            ...p,
            itemIndex: p.itemIndex > idx ? p.itemIndex - 1 : p.itemIndex,
          }))
      );

      setPageSuccess('Producto eliminado correctamente.');
    } catch (error) {
      console.error(error);
      setPageError('No se pudo eliminar el producto.');
    } finally {
      setDeletingRowId(null);
    }
  }

  const categories = useMemo(() => {
    const unique = new Set(
      products.map((item) => normalizeText(item.category)).filter(Boolean)
    );
    return ['TODAS', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === 'TODAS' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const totalProducts = products.length;
  const totalStock = useMemo(() => {
    return products.reduce((acc, item) => acc + normalizeStock(item.stock), 0);
  }, [products]);
  const dirtyCount = useMemo(() => {
    return products.filter((item) => item.isDirty).length;
  }, [products]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <p className="text-sm font-medium text-blue-400">Editor del día</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Productos del inventario base
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
              Aquí solo se editan los productos del día actual. Puedes corregir
              nombres, categorías y stock, además de agregar o quitar productos
              manualmente. En esta pantalla no se suben PDFs.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
            <span className="block text-zinc-500">Fecha activa</span>
            <span className="font-semibold text-white">{todayKey}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          icon={<Package className="h-5 w-5" />}
          title="Productos"
          value={String(totalProducts)}
          helper="Registrados hoy"
        />
        <InfoCard
          icon={<Tag className="h-5 w-5" />}
          title="Categorías"
          value={String(categories.length - 1)}
          helper="Solo del día"
        />
        <InfoCard
          icon={<Package className="h-5 w-5" />}
          title="Stock total"
          value={String(totalStock)}
          helper="Suma de existencias"
        />
        <InfoCard
          icon={<Pencil className="h-5 w-5" />}
          title="Cambios sin guardar"
          value={String(dirtyCount)}
          helper="Pendientes"
        />
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">
            Agregar producto manualmente
          </h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Nombre del producto"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, name: e.target.value }))
            }
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Categoría"
            value={newProduct.category}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, category: e.target.value }))
            }
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />
          <input
            type="number"
            min="0"
            placeholder="Stock"
            value={newProduct.stock}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, stock: e.target.value }))
            }
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />
          <button
            onClick={addProduct}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Agregar producto
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Lista editable del día
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Solo se muestran productos del inventario base activo hoy.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar producto o categoría"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-white outline-none transition focus:border-blue-500 md:w-72"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'TODAS' ? 'Todas las categorías' : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(pageError || pageSuccess) && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              pageError
                ? 'border-red-800 bg-red-950/40 text-red-300'
                : 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{pageError || pageSuccess}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
            Cargando productos del día...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
            No hay productos para mostrar con ese filtro.
          </div>
        ) : (
          <>
            <div className="mt-6 hidden overflow-hidden rounded-3xl border border-zinc-800 xl:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-800">
                  <thead className="bg-zinc-900">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Producto
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Categoría
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Stock
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                    {filteredProducts.map((product) => {
                      const isSaving = savingRowId === product.id;
                      const isDeleting = deletingRowId === product.id;
                      return (
                        <tr key={product.id} className="align-top">
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) =>
                                updateLocalField(
                                  product.id,
                                  'name',
                                  e.target.value
                                )
                              }
                              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={product.category}
                              onChange={(e) =>
                                updateLocalField(
                                  product.id,
                                  'category',
                                  e.target.value
                                )
                              }
                              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              value={product.stock}
                              onChange={(e) =>
                                updateLocalField(
                                  product.id,
                                  'stock',
                                  e.target.value
                                )
                              }
                              className="w-32 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => saveRow(product)}
                                disabled={isSaving || isDeleting}
                                className="inline-flex items-center gap-2 rounded-2xl border border-blue-700 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Save className="h-4 w-4" />
                                {isSaving ? 'Guardando...' : 'Guardar'}
                              </button>
                              <button
                                onClick={() => removeProduct(product.id)}
                                disabled={isSaving || isDeleting}
                                className="inline-flex items-center gap-2 rounded-2xl border border-red-800 bg-red-950/50 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" />
                                {isDeleting ? 'Quitando...' : 'Quitar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:hidden">
              {filteredProducts.map((product) => {
                const isSaving = savingRowId === product.id;
                const isDeleting = deletingRowId === product.id;
                return (
                  <article
                    key={product.id}
                    className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4"
                  >
                    <div className="grid gap-3">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Producto
                        </label>
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) =>
                            updateLocalField(product.id, 'name', e.target.value)
                          }
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Categoría
                        </label>
                        <input
                          type="text"
                          value={product.category}
                          onChange={(e) =>
                            updateLocalField(
                              product.id,
                              'category',
                              e.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Stock
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={product.stock}
                          onChange={(e) =>
                            updateLocalField(
                              product.id,
                              'stock',
                              e.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={() => saveRow(product)}
                          disabled={isSaving || isDeleting}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" />
                          {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => removeProduct(product.id)}
                          disabled={isSaving || isDeleting}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-900/60 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          {isDeleting ? 'Quitando...' : 'Quitar'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function InfoCard({ icon, title, value, helper }) {
  return (
    <article className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-blue-400">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-zinc-400">{title}</p>
        <h3 className="mt-1 text-2xl font-bold text-white">{value}</h3>
        <p className="mt-1 text-xs text-zinc-500">{helper}</p>
      </div>
    </article>
  );
}
