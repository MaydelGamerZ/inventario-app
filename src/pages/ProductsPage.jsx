import { useEffect, useMemo, useState } from 'react';
import {
  Tag,
  Boxes,
  Trash2,
  Plus,
  PackageSearch,
  FolderPlus,
} from 'lucide-react';
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getCategories,
  getProducts,
} from '../services/inventory';

export default function ProductsPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [error, setError] = useState('');

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });

  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    presentation: '',
    weight: '',
    sku: '',
  });

  const [search, setSearch] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [categoriesData, productsData] = await Promise.all([
        getCategories(),
        getProducts(),
      ]);

      setCategories(categoriesData);
      setProducts(productsData);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las categorías y productos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter((product) => {
      return (
        product.name?.toLowerCase().includes(term) ||
        product.categoryName?.toLowerCase().includes(term) ||
        product.presentation?.toLowerCase().includes(term) ||
        product.weight?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();

    if (!categoryForm.name.trim()) {
      setError('La categoría necesita nombre.');
      return;
    }

    try {
      setSavingCategory(true);
      setError('');

      await createCategory(categoryForm);

      setCategoryForm({
        name: '',
        description: '',
      });

      await loadData();
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar la categoría.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!productForm.name.trim()) {
      setError('El producto necesita nombre.');
      return;
    }

    if (!productForm.categoryId) {
      setError('Selecciona una categoría para el producto.');
      return;
    }

    const selectedCategory = categories.find(
      (category) => category.id === productForm.categoryId
    );

    if (!selectedCategory) {
      setError('La categoría seleccionada no es válida.');
      return;
    }

    try {
      setSavingProduct(true);
      setError('');

      await createProduct({
        ...productForm,
        categoryName: selectedCategory.name,
      });

      setProductForm({
        name: '',
        categoryId: '',
        presentation: '',
        weight: '',
        sku: '',
      });

      await loadData();
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar el producto.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const relatedProducts = products.filter(
      (product) => product.categoryId === categoryId
    );

    if (relatedProducts.length > 0) {
      setError('No puedes eliminar una categoría que todavía tiene productos.');
      return;
    }

    const confirmed = window.confirm(
      '¿Seguro que quieres eliminar esta categoría?'
    );

    if (!confirmed) return;

    try {
      setError('');
      await deleteCategory(categoryId);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar la categoría.');
    }
  };

  const handleDeleteProduct = async (productId) => {
    const confirmed = window.confirm(
      '¿Seguro que quieres eliminar este producto?'
    );

    if (!confirmed) return;

    try {
      setError('');
      await deleteProduct(productId);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar el producto.');
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-sm font-medium text-blue-400">Catálogo base</p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          Productos y categorías
        </h1>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          Aquí vas a registrar las categorías y productos que después usarás
          para comparar el inventario importado desde PDF.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-blue-400">
              <FolderPlus size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Nueva categoría</h2>
              <p className="text-sm text-zinc-400">
                Ejemplo: Cereales, Botanas, Bebidas.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Nombre de la categoría
              </label>
              <input
                type="text"
                name="name"
                value={categoryForm.name}
                onChange={handleCategoryChange}
                placeholder="Ej. Cereales"
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Descripción
              </label>
              <textarea
                name="description"
                value={categoryForm.description}
                onChange={handleCategoryChange}
                placeholder="Descripción breve de la categoría"
                rows={4}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingCategory}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={18} />
              {savingCategory ? 'Guardando...' : 'Guardar categoría'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-emerald-400">
              <PackageSearch size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Nuevo producto</h2>
              <p className="text-sm text-zinc-400">
                Relaciónalo con una categoría antes de guardarlo.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Nombre del producto
              </label>
              <input
                type="text"
                name="name"
                value={productForm.name}
                onChange={handleProductChange}
                placeholder="Ej. ZUCARITAS"
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Categoría
              </label>
              <select
                name="categoryId"
                value={productForm.categoryId}
                onChange={handleProductChange}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
              >
                <option value="">Selecciona una categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Presentación
                </label>
                <input
                  type="text"
                  name="presentation"
                  value={productForm.presentation}
                  onChange={handleProductChange}
                  placeholder="Caja, bolsa, tubo"
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Gramaje / peso
                </label>
                <input
                  type="text"
                  name="weight"
                  value={productForm.weight}
                  onChange={handleProductChange}
                  placeholder="600 GRS"
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Código / SKU
              </label>
              <input
                type="text"
                name="sku"
                value={productForm.sku}
                onChange={handleProductChange}
                placeholder="Opcional"
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingProduct}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={18} />
              {savingProduct ? 'Guardando...' : 'Guardar producto'}
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-blue-400">
              <Tag size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Categorías</h2>
              <p className="text-sm text-zinc-400">
                Total registradas: {categories.length}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-zinc-400">Cargando categorías...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Aún no has registrado categorías.
              </p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-800 bg-black p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{category.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {category.description || 'Sin descripción'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-900 bg-red-950/40 text-red-300 transition hover:bg-red-900/50"
                    title="Eliminar categoría"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-emerald-400">
                <Boxes size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Productos</h2>
                <p className="text-sm text-zinc-400">
                  Total registrados: {products.length}
                </p>
              </div>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 sm:max-w-xs"
            />
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-zinc-400">Cargando productos...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No hay productos registrados o no coincide la búsqueda.
              </p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-zinc-800 bg-black p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{product.name}</p>
                      <p className="mt-1 text-sm text-blue-400">
                        {product.categoryName || 'Sin categoría'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-900 bg-red-950/40 text-red-300 transition hover:bg-red-900/50"
                      title="Eliminar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-zinc-400 sm:grid-cols-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                      <span className="block text-xs text-zinc-500">
                        Presentación
                      </span>
                      <span className="text-zinc-300">
                        {product.presentation || '—'}
                      </span>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                      <span className="block text-xs text-zinc-500">Peso</span>
                      <span className="text-zinc-300">
                        {product.weight || '—'}
                      </span>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                      <span className="block text-xs text-zinc-500">SKU</span>
                      <span className="text-zinc-300">
                        {product.sku || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
