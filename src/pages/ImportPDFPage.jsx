import { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { parseInventoryPDF } from '../services/pdfInventoryParser';

export default function ImportPDFPage() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const resetStateForNewFile = () => {
    setError('');
    setData(null);
  };

  const handleFile = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== 'application/pdf') {
      setFile(null);
      setData(null);
      setError('El archivo seleccionado no es un PDF válido.');
      return;
    }

    setFile(selected);
    setLoading(true);
    resetStateForNewFile();

    try {
      const result = await parseInventoryPDF(selected);

      if (!result || !Array.isArray(result.categories)) {
        throw new Error('Formato de respuesta inválido del parser');
      }

      setData(result);
    } catch (err) {
      console.error(err);
      setError(
        'No se pudo procesar el PDF. Revisa que sea el archivo correcto y que el formato del documento sea compatible.'
      );
    } finally {
      setLoading(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const totalCategories = data?.categories?.length || 0;
  const totalProducts =
    data?.categories?.reduce(
      (acc, category) => acc + (category?.products?.length || 0),
      0
    ) || 0;

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Encabezado */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-400">
            <FileText size={24} />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Importar Inventario PDF
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              Sube el PDF oficial y el sistema intentará detectar categorías y
              productos automáticamente para facilitar la carga del inventario.
            </p>
          </div>
        </div>
      </section>

      {/* Área de carga */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFile}
          className="hidden"
        />

        <button
          type="button"
          onClick={openFilePicker}
          disabled={loading}
          className="
            flex w-full flex-col items-center justify-center gap-3
            rounded-3xl border border-dashed border-zinc-700 bg-black
            px-4 py-8 text-center transition
            hover:border-blue-500 hover:bg-zinc-950
            disabled:cursor-not-allowed disabled:opacity-70
            sm:px-6 sm:py-10
          "
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
              {loading ? 'Procesando PDF...' : 'Seleccionar archivo PDF'}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Compatible con carga desde teléfono, iPhone y computadora.
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
            <button
              type="button"
              onClick={openFilePicker}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
            >
              <RefreshCw size={18} />
              Reemplazar archivo
            </button>
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
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
      </section>

      {/* Estado de carga */}
      {loading && (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="flex items-center gap-3 text-zinc-300">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-sm sm:text-base">
              Analizando contenido del PDF y detectando categorías...
            </p>
          </div>
        </section>
      )}

      {/* Error */}
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

      {/* Resultado */}
      {data && !loading && (
        <div className="space-y-4">
          {/* Resumen */}
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
                  Se detectaron categorías y productos listos para revisión.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-sm text-zinc-400">Categorías detectadas</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {totalCategories}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-sm text-zinc-400">Productos detectados</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {totalProducts}
                </p>
              </div>
            </div>
          </section>

          {/* Categorías */}
          <section className="space-y-4">
            {totalCategories === 0 ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400 sm:p-6">
                El parser no encontró categorías en este archivo.
              </div>
            ) : (
              data.categories.map((cat, i) => {
                const products = Array.isArray(cat?.products)
                  ? cat.products
                  : [];

                return (
                  <article
                    key={`${cat?.name || 'categoria'}-${i}`}
                    className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-semibold text-blue-400 sm:text-xl">
                          {cat?.name || `Categoría ${i + 1}`}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          Productos detectados: {products.length}
                        </p>
                      </div>

                      <div className="inline-flex w-fit rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
                        Vista previa
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                      {products.length > 0 ? (
                        <div className="max-h-[420px] overflow-y-auto">
                          <div className="divide-y divide-zinc-800">
                            {products.map((p, idx) => (
                              <div
                                key={`${p?.name || 'producto'}-${idx}`}
                                className="flex items-start justify-between gap-4 px-4 py-3"
                              >
                                <div className="min-w-0">
                                  <p className="break-words text-sm font-medium text-white sm:text-base">
                                    {p?.name || 'Producto sin nombre'}
                                  </p>
                                </div>

                                <div className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm font-semibold text-zinc-300">
                                  {p?.quantity ?? 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-6 text-sm text-zinc-400">
                          No se detectaron productos en esta categoría.
                        </div>
                      )}
                    </div>
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
