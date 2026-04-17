import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  Layers3,
  FileWarning,
  X,
} from 'lucide-react';
import { parseInventoryPDF } from '../services/pdfInventoryParser';

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function formatFileSize(bytes = 0) {
  if (!bytes) return '0 MB';
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeProduct(product, categoryId, index = 0) {
  const name = cleanText(product?.name) || `Producto ${index + 1}`;

  const quantity =
    Number.isFinite(Number(product?.quantity)) && Number(product?.quantity) >= 0
      ? Number(product.quantity)
      : 0;

  return {
    id: `${categoryId}-product-${index}-${name}`,
    name,
    quantity,
  };
}

function normalizeCategory(category, index = 0) {
  const rawName =
    cleanText(category?.fullName) ||
    cleanText(category?.name) ||
    cleanText(category?.categoryName) ||
    `Categoría ${index + 1}`;

  const id = `category-${index}-${rawName}`;

  const products = Array.isArray(category?.products)
    ? category.products.map((product, productIndex) =>
        normalizeProduct(product, id, productIndex)
      )
    : [];

  const totalUnits = products.reduce(
    (sum, product) => sum + Number(product.quantity || 0),
    0
  );

  return {
    id,
    name: rawName,
    fullName: rawName,
    products,
    totalUnits,
  };
}

function normalizeParserResult(result) {
  const categories = Array.isArray(result?.categories)
    ? result.categories.map((category, index) =>
        normalizeCategory(category, index)
      )
    : [];

  return {
    ...result,
    categories,
  };
}

export default function ImportPDFPage({ onImportReady }) {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const resetParsedState = () => {
    setData(null);
    setError('');
    setSearch('');
    setExpandedCategories({});
  };

  const openFilePicker = () => {
    if (loading) return;
    inputRef.current?.click();
  };

  const resetAll = () => {
    setFile(null);
    setLoading(false);
    resetParsedState();

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const isValidPDF = (selectedFile) => {
    if (!selectedFile) {
      return 'No se seleccionó ningún archivo.';
    }

    const fileName = String(selectedFile.name || '').toLowerCase();
    const fileType = String(selectedFile.type || '').toLowerCase();

    const isPDFMime = fileType === 'application/pdf';
    const isPDFExtension = fileName.endsWith('.pdf');

    if (!isPDFMime && !isPDFExtension) {
      return 'El archivo seleccionado no es un PDF válido.';
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      return `El PDF supera el tamaño permitido de ${MAX_FILE_SIZE_MB} MB.`;
    }

    return '';
  };

  const buildExpandedState = (categories, expand = true) => {
    return categories.reduce((acc, category) => {
      acc[category.id] = expand;
      return acc;
    }, {});
  };

  const processSelectedFile = async (selectedFile) => {
    const validationError = isValidPDF(selectedFile);

    if (validationError) {
      setFile(null);
      setLoading(false);
      setData(null);
      setError(validationError);
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    resetParsedState();

    try {
      const result = await parseInventoryPDF(selectedFile);
      const normalized = normalizeParserResult(result);

      if (!result || !Array.isArray(normalized.categories)) {
        throw new Error('Formato de respuesta inválido del parser.');
      }

      setData(normalized);
      setExpandedCategories(buildExpandedState(normalized.categories, true));

      if (typeof onImportReady === 'function') {
        onImportReady(normalized, selectedFile);
      }
    } catch (err) {
      console.error('Error procesando PDF:', err);
      setError(
        'No se pudo procesar el PDF. Revisa que sea el archivo correcto y que el parser esté detectando correctamente las categorías completas.'
      );
      setData(null);
    } finally {
      setLoading(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processSelectedFile(selected);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setDragActive(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (loading) return;

    const selected = e.dataTransfer?.files?.[0];
    if (!selected) return;

    await processSelectedFile(selected);
  };

  const totalCategories = data?.categories?.length || 0;

  const totalProducts =
    data?.categories?.reduce(
      (acc, category) => acc + (category?.products?.length || 0),
      0
    ) || 0;

  const totalUnits =
    data?.categories?.reduce(
      (acc, category) => acc + Number(category?.totalUnits || 0),
      0
    ) || 0;

  const filteredCategories = useMemo(() => {
    if (!data?.categories?.length) return [];

    const term = cleanText(search).toLowerCase();

    if (!term) return data.categories;

    return data.categories
      .map((category) => {
        const categoryMatches = category.fullName.toLowerCase().includes(term);

        const filteredProducts = category.products.filter((product) =>
          product.name.toLowerCase().includes(term)
        );

        if (categoryMatches) {
          return category;
        }

        if (filteredProducts.length > 0) {
          return {
            ...category,
            products: filteredProducts,
            totalUnits: filteredProducts.reduce(
              (sum, product) => sum + Number(product.quantity || 0),
              0
            ),
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [data, search]);

  const filteredTotalCategories = filteredCategories.length;

  const filteredTotalProducts = filteredCategories.reduce(
    (acc, category) => acc + category.products.length,
    0
  );

  const filteredTotalUnits = filteredCategories.reduce(
    (acc, category) => acc + Number(category.totalUnits || 0),
    0
  );

  useEffect(() => {
    if (!search.trim()) return;

    setExpandedCategories((prev) => {
      const next = { ...prev };

      filteredCategories.forEach((category) => {
        next[category.id] = true;
      });

      return next;
    });
  }, [search, filteredCategories]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const expandAll = () => {
    setExpandedCategories(buildExpandedState(filteredCategories, true));
  };

  const collapseAll = () => {
    setExpandedCategories(buildExpandedState(filteredCategories, false));
  };

  const hasResults = Boolean(data && !loading);
  const hasFilteredResults = filteredCategories.length > 0;

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-400">
            <FileText size={24} />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Importar Inventario PDF
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              Sube el PDF oficial del inventario. Las categorías se muestran con
              su nombre completo y cada una se puede desplegar o plegar para ver
              sus productos.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={openFilePicker}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={loading}
          className={[
            'flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed px-4 py-8 text-center transition sm:px-6 sm:py-10',
            dragActive
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-zinc-700 bg-black hover:border-blue-500 hover:bg-zinc-950',
            loading ? 'cursor-not-allowed opacity-70' : '',
          ].join(' ')}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-300">
            {loading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Upload size={24} />
            )}
          </div>

          <div>
            <p className="text-base font-semibold text-white sm:text-lg">
              {loading ? 'Procesando PDF...' : 'Seleccionar o arrastrar PDF'}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Compatible con teléfono, iPhone y computadora. Tamaño máximo:{' '}
              {MAX_FILE_SIZE_MB} MB.
            </p>
          </div>
        </button>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={loading}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FolderOpen size={18} />
            Elegir PDF
          </button>

          {file && !loading && (
            <>
              <button
                type="button"
                onClick={openFilePicker}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
              >
                <RefreshCw size={18} />
                Reemplazar archivo
              </button>

              <button
                type="button"
                onClick={resetAll}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-950/50"
              >
                <X size={18} />
                Limpiar
              </button>
            </>
          )}
        </div>

        {file && (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Archivo seleccionado
            </p>
            <p className="mt-2 break-all text-sm font-medium text-white">
              {file.name}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {formatFileSize(file.size)}
            </p>
          </div>
        )}
      </section>

      {loading && (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="flex items-center gap-3 text-zinc-300">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-sm sm:text-base">
              Analizando contenido del PDF y organizando productos por
              categoría...
            </p>
          </div>
        </section>
      )}

      {error && (
        <section className="rounded-3xl border border-red-900/60 bg-red-950/30 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-red-400">
              <AlertCircle size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-red-300">
                Error al procesar el archivo
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-200/90">{error}</p>
            </div>
          </div>
        </section>
      )}

      {hasResults && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="text-emerald-400">
                <CheckCircle2 size={22} />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white">
                  PDF procesado correctamente
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Revisa el inventario detectado antes de cargarlo al sistema.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Layers3 size={16} />
                  <p className="text-sm">Categorías detectadas</p>
                </div>
                <p className="mt-1 text-2xl font-bold text-white">
                  {totalCategories}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Package size={16} />
                  <p className="text-sm">Productos detectados</p>
                </div>
                <p className="mt-1 text-2xl font-bold text-white">
                  {totalProducts}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:col-span-2 xl:col-span-1">
                <div className="flex items-center gap-2 text-zinc-400">
                  <FileText size={16} />
                  <p className="text-sm">Unidades detectadas</p>
                </div>
                <p className="mt-1 text-2xl font-bold text-white">
                  {totalUnits.toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar categoría o producto..."
                  className="w-full rounded-2xl border border-zinc-800 bg-black py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={expandAll}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
                >
                  <ChevronDown size={16} />
                  Expandir todo
                </button>

                <button
                  type="button"
                  onClick={collapseAll}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
                >
                  <ChevronUp size={16} />
                  Contraer todo
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-sm text-zinc-400">Categorías visibles</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {filteredTotalCategories}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-sm text-zinc-400">Productos visibles</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {filteredTotalProducts}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-sm text-zinc-400">Unidades visibles</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {filteredTotalUnits.toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {!hasFilteredResults ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <div className="flex items-start gap-3 text-zinc-400">
                  <FileWarning size={20} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      No se encontraron resultados
                    </p>
                    <p className="mt-1 text-sm leading-6">
                      No hay categorías o productos que coincidan con tu
                      búsqueda.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              filteredCategories.map((category, index) => {
                const isExpanded = expandedCategories[category.id] ?? true;
                const products = Array.isArray(category.products)
                  ? category.products
                  : [];

                return (
                  <article
                    key={category.id}
                    className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-zinc-900/50 sm:px-6"
                    >
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-semibold text-blue-400 sm:text-lg">
                          {category.fullName || `Categoría ${index + 1}`}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          {products.length} productos •{' '}
                          {Number(category.totalUnits || 0).toLocaleString(
                            'es-MX'
                          )}{' '}
                          unidades
                        </p>
                      </div>

                      <div className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300">
                        {isExpanded ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-zinc-800 bg-black">
                        {products.length > 0 ? (
                          <div className="max-h-[520px] overflow-y-auto">
                            <div className="divide-y divide-zinc-800">
                              {products.map((product, productIndex) => (
                                <div
                                  key={
                                    product.id ||
                                    `${category.id}-${productIndex}`
                                  }
                                  className="flex items-start justify-between gap-4 px-4 py-3 sm:px-6"
                                >
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-medium text-white sm:text-base">
                                      {product.name}
                                    </p>
                                  </div>

                                  <div className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm font-semibold text-zinc-300">
                                    {Number(
                                      product.quantity || 0
                                    ).toLocaleString('es-MX')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 py-6 text-sm text-zinc-400 sm:px-6">
                            No se detectaron productos en esta categoría.
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        </div>
      )}
    </div>
  );
}
