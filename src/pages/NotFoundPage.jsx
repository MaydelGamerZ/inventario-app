import { Link, useNavigate } from 'react-router-dom';
import { TriangleAlert, House, ArrowLeft } from 'lucide-react';

/**
 * Pantalla 404 cuando la ruta no existe.
 * - Muestra mensaje claro de error.
 * - Permite volver al inicio.
 * - Permite regresar a la página anterior.
 * - Optimizada para móvil/iPhone y escritorio.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  function handleGoBack() {
    try {
      navigate(-1);
    } catch {
      navigate('/', { replace: true });
    }
  }

  return (
    <main
      className="
        flex min-h-screen min-h-[100dvh] items-center justify-center
        bg-zinc-950 px-4 py-8 text-white
        pt-[max(2rem,env(safe-area-inset-top))]
        pb-[max(2rem,env(safe-area-inset-bottom))]
        pl-[max(1rem,env(safe-area-inset-left))]
        pr-[max(1rem,env(safe-area-inset-right))]
      "
    >
      <section
        className="
          w-full max-w-lg rounded-3xl border border-zinc-800
          bg-zinc-900 p-8 text-center shadow-2xl
          sm:p-10
        "
        aria-labelledby="not-found-title"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
          <TriangleAlert size={30} />
        </div>

        <p className="mt-5 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Error de navegación
        </p>

        <h1
          id="not-found-title"
          className="mt-3 text-5xl font-bold tracking-tight sm:text-6xl"
        >
          404
        </h1>

        <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          Página no encontrada
        </h2>

        <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
          La página que intentas abrir no existe, cambió de ruta o ya no está
          disponible dentro del sistema.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleGoBack}
            className="
              inline-flex min-h-[48px] items-center justify-center gap-2
              rounded-2xl border border-zinc-700 bg-black px-5 py-3
              font-semibold text-white transition
              hover:border-zinc-500 hover:bg-zinc-950
              active:scale-[0.99]
            "
          >
            <ArrowLeft size={18} />
            Volver atrás
          </button>

          <Link
            to="/"
            className="
              inline-flex min-h-[48px] items-center justify-center gap-2
              rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white
              transition hover:bg-blue-500 active:scale-[0.99]
            "
          >
            <House size={18} />
            Ir al inicio
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
          <p className="text-xs leading-5 text-zinc-500 sm:text-sm">
            Revisa la dirección o vuelve al panel principal para continuar.
          </p>
        </div>
      </section>
    </main>
  );
}
