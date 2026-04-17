import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  Loader2,
  Boxes,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
} from 'lucide-react';
import {
  getInventoryByDate,
  subscribeInventoryByDate,
  updateInventory,
} from '../services/inventory';

function getTodayKey() {
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

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStock(value) {
  const cleaned = String(value ?? '')
    .replace(/[^\d.-]/g, '')
    .trim();

  const number = Number(cleaned);
  if (Number.isNaN(number) || number < 0) return 0;

  return Math.floor(number);
}

function makeLocalId(prefix = 'row') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildItemKey(item, idx = 0) {
  const supplierCode = normalizeText(item?.supplierCode || '').toLowerCase();
  const categoryCode = normalizeText(item?.categoryCode || '').toLowerCase();
  const productName = normalizeText(item?.productName || '').toLowerCase();

  return (
    normalizeText(item?.itemKey) ||
    `${supplierCode}::${categoryCode}::${productName || `item-${idx}`}`
  );
}

function getItemStatus(expectedQuantity, unavailableQuantity) {
  const stock = normalizeStock(expectedQuantity);
  const unavailable = normalizeStock(unavailableQuantity);

  if (stock <= 0) return 'FALTANTE';
  if (unavailable > 0) return 'ALERTA';
  return 'OK';
}

function sortProducts(list = [], sortMode = 'name') {
  const items = Array.isArray(list) ? [...list] : [];

  return items.sort((a, b) => {
    const aName = normalizeText(a.name).toLowerCase();
    const bName = normalizeText(b.name).toLowerCase();
    const aCategory = normalizeText(a.category).toLowerCase();
    const bCategory = normalizeText(b.category).toLowerCase();
    const aStock = normalizeStock(a.stock);
    const bStock = normalizeStock(b.stock);

    if (sortMode === 'stock-desc') {
      if (bStock !== aStock) return bStock - aStock;
      return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
    }

    if (sortMode === 'stock-asc') {
      if (aStock !== bStock) return aStock - bStock;
      return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
    }

    if (sortMode === 'category') {
      const categoryCompare = aCategory.localeCompare(bCategory, 'es', {
        sensitivity: 'base',
      });
      if (categoryCompare !== 0) return categoryCompare;
      return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
    }

    return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
  });
}

function rebuildCategoriesFromItems(items = []) {
  const map = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const supplierCode = normalizeText(item?.supplierCode);
    const supplierName = normalizeText(item?.supplierName);
    const categoryCode = normalizeText(item?.categoryCode);
    const categoryName = normalizeText(item?.categoryName) || 'Sin categoría';
    const categoryRaw =
      normalizeText(item?.categoryRaw) || normalizeText(item?.categoryName);
    const fullName =
      normalizeText(item?.fullName) ||
      normalizeText(item?.categoryRaw) ||
      normalizeText(item?.categoryName) ||
      'Sin categoría';

    const key = [supplierCode, categoryCode, categoryName].join('::');

    if (!map.has(key)) {
      map.set(key, {
        supplierCode,
        supplierName,
        categoryCode,
        categoryName,
        categoryRaw,
        fullName,
        itemCount: 0,
        quantityTotal: 0,
        noDisponibleTotal: 0,
      });
    }

    const ref = map.get(key);
    ref.itemCount += 1;
    ref.quantityTotal += normalizeStock(item?.expectedQuantity);
    ref.noDisponibleTotal += normalizeStock(item?.unavailableQuantity);
  }

  return Array.from(map.values()).sort((a, b) =>
    normalizeText(a.fullName).localeCompare(normalizeText(b.fullName), 'es', {
      sensitivity: 'base',
    })
  );
}

function mapInventoryItemsToEditorProducts(inv) {
  return Array.isArray(inv?.items)
    ? inv.items.map((item, idx) => ({
        id: makeLocalId('product'),
        sourceKey: buildItemKey(item, idx),
        name: item.productName || '',
        category: item.categoryName || item.categoryRaw || '',
        stock: item.expectedQuantity ?? 0,
        unavailableQuantity: item.unavailableQuantity ?? 0,
        status:
          item.status ||
          getItemStatus(item.expectedQuantity, item.unavailableQuantity),
        supplierCode: item.supplierCode || '',
        supplierName: item.supplierName || '',
        categoryCode: item.categoryCode || '',
        categoryRaw: item.categoryRaw || '',
        countEntries: Array.isArray(item.countEntries) ? item.countEntries : [],
        observation: item.observation || '',
        isDirty: false,
        isNew: false,
      }))
    : [];
}

function buildInventoryItemsFromEditorProducts(products = [], previousItems = []) {
  const previousMap = new Map(
    (Array.isArray(previousItems) ? previousItems : []).map((item, idx) => [
      buildItemKey(item, idx),
      item,
    ])
  );

  return products.map((product, idx) => {
    const previous = previousMap.get(product.sourceKey) || {};

    const expectedQuantity = normalizeStock(product.stock);
    const unavailableQuantity = normalizeStock(product.unavailableQuantity);

    return {
      itemKey: previous.itemKey || product.sourceKey || buildItemKey(product, idx),
      productName: normalizeText(product.name),
      categoryName: normalizeText(product.category),
      categoryCode: normalizeText(product.categoryCode),
      categoryRaw:
        normalizeText(product.categoryRaw) || normalizeText(product.category),
      supplierName: normalizeText(product.supplierName),
      supplierCode: normalizeText(product.supplierCode),
      expectedQuantity,
      unavailableQuantity,
      countedQuantity: previous.countedQuantity ?? '',
      total: previous.total ?? '',
      difference: previous.difference ?? '',
      observation: previous.observation || product.observation || '',
      countEntries: Array.isArray(previous.countEntries) ? previous.countEntries : [],
      status: getItemStatus(expectedQuantity, unavailableQuantity),
    };
  });
}

function InfoCard({ icon, title, value, helper }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-[#050505] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-blue-400">
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-zinc-400">{title}</p>
        <h3 className="mt-1 text-2xl font-semibold text-white">{value}</h3>
        <p className="mt-1 text-xs text-zinc-500">{helper}</p>
      </div>
    </article>
  );
}

export default function ProductsPage() {
  const todayKey = useMemo(() => getTodayKey(), []);
  const todayLabel = useMemo(() => formatDateLabelFromKey(todayKey), [todayKey]);

  const [inventoryId, setInventoryId] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingRowId, setSavingRowId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);
  const [addingProduct, setAddingProduct] = useState(false);

  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  const [sortMode, setSortMode] = useState('name');
  const [showOnlyDirty, setShowOnlyDirty] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    stock: '',
  });

  useEffect(() => {
    setLoading(true);
    setPageError('');
    setPageSuccess('');

    const unsubscribe = subscribeInventoryByDate(todayKey, (inv) => {
      if (!inv) {
        setInventoryId(null);
        setInventoryData(null);
        setProducts([]);
        setLoading(false);
        return;
      }

      setInventoryId(inv.id);
      setInventoryData(inv);
      setProducts((prev) => {
        const dirtyMap = new Map(
          prev.filter((item) => item.isDirty).map((item) => [item.sourceKey, item])
        );

        const incoming = mapInventoryItemsToEditorProducts(inv);

        return incoming.map((item) => {
          const dirtyVersion = dirtyMap.get(item.sourceKey);
          return dirtyVersion ? { ...dirtyVersion } : item;
        });
      });

      setLoading(false);
    });

    return () => unsubscribe?.();
  }, [todayKey]);

  async function loadTodayInventoryFallback() {
    setLoading(true);
    setPageError('');
    setPageSuccess('');

    try {
      const inv = await getInventoryByDate(todayKey);

      if (!inv) {
        setInventoryId(null);
        setInventoryData(null);
        setProducts([]);
        return;
      }

      setInventoryId(inv.id);
      setInventoryData(inv);
      setProducts(mapInventoryItemsToEditorProducts(inv));
    } catch (error) {
      console.error(error);
      setPageError('No se pudo cargar el inventario del día.');
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setPageError('');
    setPageSuccess('');
  }

  function updateLocalField(id, field, value) {
    clearMessages();

    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = {
          ...item,
          [field]: value,
          isDirty: true,
        };

        if (field === 'stock') {
          updated.status = getItemStatus(value, item.unavailableQuantity);
        }

        if (field === 'category') {
          updated.categoryRaw = value;
        }

        return updated;
      })
    );
  }

  async function saveAllProducts(nextProducts, successMessage) {
    if (!inventoryId || !inventoryData) {
      setPageError('No se ha cargado un inventario válido del día.');
      return false;
    }

    const invalid = nextProducts.find(
      (product) =>
        !normalizeText(product.name) || !normalizeText(product.category)
    );

    if (invalid) {
      setPageError('Todos los productos deben tener nombre y categoría.');
      return false;
    }

    const updatedItems = buildInventoryItemsFromEditorProducts(
      nextProducts,
      inventoryData.items || []
    );

    const updatedInv = {
      ...inventoryData,
      items: updatedItems,
      categories: rebuildCategoriesFromItems(updatedItems),
    };

    await updateInventory(inventoryId, updatedInv);
    setInventoryData(updatedInv);
    setPageSuccess(successMessage);
    return true;
  }

  async function saveRow(product) {
    clearMessages();

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
      setPageError('No se ha cargado un inventario válido del día.');
      return;
    }

    try {
      setSavingRowId(product.id);

      const nextProducts = products.map((item) =>
        item.id === product.id
          ? {
              ...item,
              name: cleanName,
              category: cleanCategory,
              categoryRaw: cleanCategory,
              stock: cleanStock,
              status: getItemStatus(cleanStock, item.unavailableQuantity),
              isDirty: false,
            }
          : item
      );

      const saved = await saveAllProducts(
        nextProducts,
        'Producto actualizado correctamente.'
      );

      if (saved) {
        setProducts(nextProducts);
      }
    } catch (error) {
      console.error(error);
      setPageError('No se pudo guardar el producto.');
    } finally {
      setSavingRowId(null);
    }
  }

  async function addProduct() {
    clearMessages();

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
      setPageError(
        'No existe un inventario cargado para hoy. Primero debes cargar el inventario del día.'
      );
      return;
    }

    try {
      setAddingProduct(true);

      const addedLocalProduct = {
        id: makeLocalId('product'),
        sourceKey: makeLocalId('new-item'),
        name: cleanName,
        category: cleanCategory,
        stock: cleanStock,
        unavailableQuantity: 0,
        status: getItemStatus(cleanStock, 0),
        supplierCode: '',
        supplierName: '',
        categoryCode: '',
        categoryRaw: cleanCategory,
        countEntries: [],
        observation: '',
        isDirty: false,
        isNew: true,
      };

      const nextProducts = [addedLocalProduct, ...products];
      const saved = await saveAllProducts(
        nextProducts,
        'Producto agregado correctamente.'
      );

      if (saved) {
        setProducts(nextProducts);
        setNewProduct({
          name: '',
          category: '',
          stock: '',
        });
      }
    } catch (error) {
      console.error(error);
      setPageError('No se pudo agregar el producto.');
    } finally {
      setAddingProduct(false);
    }
  }

  async function removeProduct(productId) {
    clearMessages();

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

      const nextProducts = products.filter((p) => p.id !== productId);
      const saved = await saveAllProducts(
        nextProducts,
        'Producto eliminado correctamente.'
      );

      if (saved) {
        setProducts(nextProducts);
      }
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

    return [
      'TODAS',
      ...Array.from(unique).sort((a, b) => a.localeCompare(b, 'es')),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((item) => {
      const matchesSearch =
        normalizeText(item.name).toLowerCase().includes(normalizedSearch) ||
        normalizeText(item.category).toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        categoryFilter === 'TODAS' ||
        normalizeText(item.category) === categoryFilter;

      const matchesDirty = showOnlyDirty ? item.isDirty : true;

      return matchesSearch && matchesCategory && matchesDirty;
    });
  }, [products, search, categoryFilter, showOnlyDirty]);

  const groupedProducts = useMemo(() => {
    const sorted = sortProducts(filteredProducts, sortMode);
    const map = new Map();

    for (const product of sorted) {
      const category = normalizeText(product.category) || 'Sin categoría';

      if (!map.has(category)) {
        map.set(category, {
          id: category,
          name: category,
          products: [],
        });
      }

      map.get(category).products.push(product);
    }

    return Array.from(map.values());
  }, [filteredProducts, sortMode]);

  useEffect(() => {
    if (!groupedProducts.length) {
      setExpandedCategories({});
      return;
    }

    setExpandedCategories((prev) => {
      const next = { ...prev };

      groupedProducts.forEach((group) => {
        if (typeof next[group.id] === 'undefined') {
          next[group.id] = true;
        }
      });

      return next;
    });
  }, [groupedProducts]);

  const totalProducts = products.length;

  const totalStock = useMemo(() => {
    return products.reduce((acc, item) => acc + normalizeStock(item.stock), 0);
  }, [products]);

  const dirtyCount = useMemo(() => {
    return products.filter((item) => item.isDirty).length;
  }, [products]);

  const hasTodayInventory = !!inventoryId && !!inventoryData;

  const visibleProductsCount = groupedProducts.reduce(
    (sum, group) => sum + group.products.length,
    0
  );

  function toggleCategory(categoryId) {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }

  function expandAll() {
    const next = {};
    groupedProducts.forEach((group) => {
      next[group.id] = true;
    });
    setExpandedCategories(next);
  }

  function collapseAll() {
    const next = {};
    groupedProducts.forEach((group) => {
      next[group.id] = false;
    });
    setExpandedCategories(next);
  }

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <section className="rounded-[28px] border border-white/10 bg-[#050505] p-4 sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-blue-300">
          Editor del día
        </p>

        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Productos del inventario base
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
              Aquí solo se editan los productos del día actual. Puedes corregir
              nombres, categorías y stock, además de agregar o quitar productos
              manualmente. En esta pantalla no se suben PDFs.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
            <span className="block text-zinc-500">Fecha activa</span>
            <span className="font-semibold text-white">{todayLabel}</span>
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
          value={String(Math.max(categories.length - 1, 0))}
          helper="Solo del día"
        />

        <InfoCard
          icon={<Boxes className="h-5 w-5" />}
          title="Stock total"
          value={String(totalStock.toLocaleString('es-MX'))}
          helper="Suma de existencias"
        />

        <InfoCard
          icon={<Pencil className="h-5 w-5" />}
          title="Cambios sin guardar"
          value={String(dirtyCount)}
          helper="Pendientes"
        />
      </section>

      {!loading && !hasTodayInventory && (
        <section className="rounded-[28px] border border-yellow-900/60 bg-yellow-950/20 p-5">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div className="text-sm leading-6 text-yellow-100">
              No hay inventario cargado para hoy. Primero debes subir el PDF del
              inventario diario para poder editar productos.
            </div>
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-white/10 bg-[#050505] p-4 sm:p-6">
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
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />

          <input
            type="text"
            placeholder="Categoría"
            value={newProduct.category}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, category: e.target.value }))
            }
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />

          <input
            type="number"
            min="0"
            placeholder="Stock"
            value={newProduct.stock}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, stock: e.target.value }))
            }
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />

          <button
            onClick={addProduct}
            disabled={addingProduct || !hasTodayInventory}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addingProduct ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {addingProduct ? 'Agregando...' : 'Agregar producto'}
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050505] p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Lista editable del día
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Solo se muestran productos del inventario base activo hoy.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={expandAll}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.06]"
            >
              <ChevronDown className="h-4 w-4" />
              Expandir todo
            </button>

            <button
              type="button"
              onClick={collapseAll}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.06]"
            >
              <ChevronUp className="h-4 w-4" />
              Contraer todo
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar producto o categoría"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-10 text-white outline-none transition focus:border-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-blue-500"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'TODAS' ? 'Todas las categorías' : category}
              </option>
            ))}
          </select>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-blue-500"
          >
            <option value="name">Ordenar: nombre</option>
            <option value="category">Ordenar: categoría</option>
            <option value="stock-desc">Ordenar: stock mayor</option>
            <option value="stock-asc">Ordenar: stock menor</option>
          </select>

          <label className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200">
            <Filter className="h-4 w-4" />
            <span>Solo cambios</span>
            <input
              type="checkbox"
              checked={showOnlyDirty}
              onChange={(e) => setShowOnlyDirty(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-zinc-400">Categorías visibles</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {groupedProducts.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-zinc-400">Productos visibles</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {visibleProductsCount}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-zinc-400">Cambios pendientes</p>
            <p className="mt-1 text-xl font-semibold text-white">{dirtyCount}</p>
          </div>
        </div>

        {(pageError || pageSuccess) && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              pageError
                ? 'border-red-800 bg-red-950/30 text-red-200'
                : 'border-emerald-800 bg-emerald-950/30 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{pageError || pageSuccess}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando productos del día...
            </div>

            <button
              type="button"
              onClick={loadTodayInventoryFallback}
              className="mt-4 inline-flex min-h-[40px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.06]"
            >
              Reintentar
            </button>
          </div>
        ) : groupedProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
            {hasTodayInventory
              ? 'No hay productos para mostrar con ese filtro.'
              : 'No hay productos cargados para hoy.'}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {groupedProducts.map((group) => {
              const isExpanded = expandedCategories[group.id] ?? true;

              return (
                <article
                  key={group.id}
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]"
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(group.id)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-white/[0.04] sm:px-5"
                  >
                    <div className="min-w-0">
                      <h3 className="break-words text-base font-semibold text-blue-400 sm:text-lg">
                        {group.name}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {group.products.length} productos
                      </p>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-white/10 bg-black p-2 text-zinc-300">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/10 p-4 sm:p-5">
                      <div className="grid gap-4">
                        {group.products.map((product) => {
                          const isSaving = savingRowId === product.id;
                          const isDeleting = deletingRowId === product.id;

                          return (
                            <article
                              key={product.id}
                              className="rounded-[24px] border border-white/10 bg-[#050505] p-4"
                            >
                              <div className="grid gap-3">
                                <div className="grid gap-3 xl:grid-cols-3">
                                  <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                      Producto
                                    </label>
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
                                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
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
                                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
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
                                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <span className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-300">
                                    Estado: {product.status}
                                  </span>

                                  {product.isDirty && (
                                    <span className="rounded-xl border border-yellow-800 bg-yellow-950/30 px-3 py-1 text-xs font-medium text-yellow-300">
                                      Cambio pendiente
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2 sm:flex sm:flex-wrap">
                                  <button
                                    onClick={() => saveRow(product)}
                                    disabled={isSaving || isDeleting}
                                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                                  >
                                    {isSaving ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                    {isSaving ? 'Guardando...' : 'Guardar'}
                                  </button>

                                  <button
                                    onClick={() => removeProduct(product.id)}
                                    disabled={isSaving || isDeleting}
                                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-900/50 disabled:opacity-60"
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                    {isDeleting ? 'Quitando...' : 'Quitar'}
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
