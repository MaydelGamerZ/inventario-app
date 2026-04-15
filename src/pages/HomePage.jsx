import { useAuth } from '../context/AuthContext.jsx';
import { CircleCheckBig, UserRound, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <p className="text-sm font-medium text-blue-400">Bienvenido</p>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          Sistema de Inventario
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Este panel será la base para cargar inventarios diarios, importar el
          PDF oficial, revisar categorías y después hacer el conteo físico desde
          el teléfono.
        </p>
      </section>

      {/* Tarjetas principales */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-800 text-white">
              <UserRound size={22} />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Usuario actual</p>
              <h3 className="text-base font-semibold text-white">
                {user?.displayName || 'Sin nombre'}
              </h3>
            </div>
          </div>

          <p className="mt-4 break-all text-sm text-zinc-400">
            {user?.email || 'Sin correo'}
          </p>
        </article>

        <article className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-900/40 text-green-400">
              <CircleCheckBig size={22} />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Estado del sistema</p>
              <h3 className="text-base font-semibold text-green-400">Activo</h3>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-zinc-400">
            Login, rutas protegidas e inventario diario ya están funcionando.
          </p>
        </article>

        <article className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Siguiente módulo operativo</p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            Cargar inventario diario
          </h3>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Desde aquí seguirá la importación del PDF oficial para crear
            categorías y productos automáticamente.
          </p>

          <Link
            to="/inventario-diario"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Ir a Inventario Diario
            <ArrowRight size={18} />
          </Link>
        </article>
      </section>

      {/* Bloque informativo */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-white sm:text-xl">
          Cómo debe usarse esta app
        </h3>

        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-zinc-950 p-4">
            <p className="text-sm font-semibold text-white">
              1. Crear inventario del día
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Primero se genera el inventario base correspondiente a la fecha
              actual.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-950 p-4">
            <p className="text-sm font-semibold text-white">
              2. Importar PDF oficial
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              El sistema leerá categorías, productos, stock esperado y no
              disponible.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-950 p-4">
            <p className="text-sm font-semibold text-white">
              3. Hacer conteo físico
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Después se registrarán conteos por producto directamente desde el
              teléfono.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
