import { Link } from 'react-router-dom';
import { TriangleAlert, House } from 'lucide-react';

/**
 * Pantalla 404 cuando la ruta no existe.
 * Incluye acceso de regreso al inicio.
 */
export default function NotFoundPage() {
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
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
          <TriangleAlert size={30} />
        </div>

        <h1 className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl">
          404
        </h1>

        <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          Página no encontrada
        </h2>

        <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
          La página que intentas abrir no existe o la ruta ya no está
          disponible.
        </p>

        <Link
          to="/"
          className="
            mt-6 inline-flex min-h-[48px] items-center justify-center gap-2
            rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white
            transition hover:bg-blue-500 active:scale-[0.99]
          "
        >
          <House size={18} />
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
