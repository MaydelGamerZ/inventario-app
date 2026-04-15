import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Package, Search, Plus, Save, Trash2, Tag, Pencil } from 'lucide-react';

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

const INVENTORY_COLLECTION = 'inventory_base';
const PRODUCTS_SUBCOLLECTION = 'products';

export default function ProductsPage() {
  const todayKey = getTodayKey();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    stock: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const ref = collection(
        db,
        INVENTORY_COLLECTION,
        todayKey,
        PRODUCTS_SUBCOLLECTION
      );

      const q = query(ref, orderBy('category'), orderBy('name'));
      const snap = await getDocs(q);

      const rows = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name || '',
        category: docSnap.data().category || '',
        stock: docSnap.data().stock ?? 0,
        isDirty: false,
      }));

      setProducts(rows);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los productos del día.');
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
              [field]: value,
              isDirty: true,
            }
          : item
      )
    );
  }

  async function saveRow(product) {
    setSavingId(product.id);
    setError('');
    setMessage('');

    const cleanName = normalizeText(product.name);
    const cleanCategory = normalizeText(product.category);
    const cleanStock = normalizeStock(product.stock);

    if (!cleanName) {
      setSavingId(null);
      setError('El producto debe tener nombre.');
      return;
    }

    if (!cleanCategory) {
      setSavingId(null);
      setError('El producto debe tener categoría.');
      return;
    }

    try {
      const productRef = doc(
        db,
        INVENTORY_COLLECTION,
        todayKey,
        PRODUCTS_SUBCOLLECTION,
        product.id
      );

      await updateDoc(productRef, {
        name: cleanName,
        category: cleanCategory,
        stock: cleanStock,
        updatedAt: serverTimestamp(),
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                name: cleanName,
                category: cleanCategory,
                stock: cleanStock,
                isDirty: false,
              }
            : item
        )
      );

      setMessage('Producto actualizado correctamente.');
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar el producto.');
    } finally {
      setSavingId(null);
    }
  }

  async function addProduct() {
    setError('');
    setMessage('');

    const cleanName = normalizeText(newProduct.name);
    const cleanCategory = normalizeText(newProduct.category);
    const cleanStock = normalizeStock(newProduct.stock);

    if (!cleanName) {
      setError('Escribe el nombre del producto.');
      return;
    }

    if (!cleanCategory) {
      setError('Escribe la categoría del producto.');
      return;
    }

    try {
      const id =
        crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const dayRef = doc(db, INVENTORY_COLLECTION, todayKey);
      const productRef = doc(
        db,
        INVENTORY_COLLECTION,
        todayKey,
        PRODUCTS_SUBCOLLECTION,
        id
      );

      await setDoc(
        dayRef,
        {
          dateKey: todayKey,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(productRef, {
        name: cleanName,
        category: cleanCategory,
        stock: cleanStock,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setProducts((prev) => [
        {
          id,
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

      setMessage('Producto agregado correctamente.');
    } catch (err) {
      console.error(err);
      setError('No se pudo agregar el producto.');
    }
  }

  async function removeProduct(id) {
    const ok = window.confirm('¿Seguro que quieres quitar este producto?');
    if (!ok) return;

    setDeletingId(id);
    setError('');
    setMessage('');

    try {
      const productRef = doc(
        db,
        INVENTORY_COLLECTION,
        todayKey,
        PRODUCTS_SUBCOLLECTION,
        id
      );

      await deleteDoc(productRef);
      setProducts((prev) => prev.filter((item) => item.id !== id));
      setMessage('Producto eliminado correctamente.');
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar el producto.');
    } finally {
      setDeletingId(null);
    }
  }

  const categories = useMemo(() => {
    const unique = new Set(
      products.map((p) => normalizeText(p.category)).filter(Boolean)
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
  const totalCategories = categories.length - 1;
  const totalStock = products.reduce(
    (acc, item) => acc + normalizeStock(item.stock),
    0
  );
  const dirtyCount = products.filter((item) => item.isDirty).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <p className="text-sm font-medium text-blue-400">Editor del día</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Productos y categorías
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
          Aquí solo se editan los productos del inventario del día actual. No se
          pueden subir documentos en esta ventana.
        </p>
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
          value={String(totalCategories)}
          helper="Solo del día"
        />
        <InfoCard
          icon={<Package className="h-5 w-5" />}
          title="Stock total"
          value={String(totalStock)}
          helper="Existencia registrada"
        />
        <InfoCard
          icon={<Pencil className="h-5 w-5" />}
          title="Cambios pendientes"
          value={String(dirtyCount)}
          helper="Sin guardar"
        />
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-white">Agregar producto</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Nombre del producto"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, name: e.target.value }))
            }
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-blue-500"
          />

          <input
            type="text"
            placeholder="Categoría"
            value={newProduct.category}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, category: e.target.value }))
            }
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-blue-500"
          />

          <input
            type="number"
            min="0"
            placeholder="Stock"
            value={newProduct.stock}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, stock: e.target.value }))
            }
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-blue-500"
          />

          <button
            onClick={addProduct}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Productos del día
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Solo aparecen productos del inventario actual.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500 md:w-72"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'TODAS' ? 'Todas las categorías' : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(error || message) && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? 'border-red-800 bg-red-950/40 text-red-300'
                : 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
            }`}
          >
            {error || message}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-400">
            Cargando productos...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-400">
            No hay productos para mostrar.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4"
              >
                <div className="grid gap-3 lg:grid-cols-[2fr_1.2fr_180px_auto_auto]">
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) =>
                      updateLocalField(product.id, 'name', e.target.value)
                    }
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
                  />

                  <input
                    type="text"
                    value={product.category}
                    onChange={(e) =>
                      updateLocalField(product.id, 'category', e.target.value)
                    }
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
                  />

                  <input
                    type="number"
                    min="0"
                    value={product.stock}
                    onChange={(e) =>
                      updateLocalField(product.id, 'stock', e.target.value)
                    }
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
                  />

                  <button
                    onClick={() => saveRow(product)}
                    disabled={savingId === product.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {savingId === product.id ? 'Guardando...' : 'Guardar'}
                  </button>

                  <button
                    onClick={() => removeProduct(product.id)}
                    disabled={deletingId === product.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-900/60 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === product.id ? 'Quitando...' : 'Quitar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({ icon, title, value, helper }) {
  return (
    <article className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-blue-400 w-fit">
        {icon}
      </div>
      <p className="mt-4 text-sm text-zinc-400">{title}</p>
      <h3 className="mt-1 text-2xl font-bold text-white">{value}</h3>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </article>
  );
}
