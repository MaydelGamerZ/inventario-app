import { User, ShieldCheck, ClipboardList, Boxes } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      {/* Bienvenida */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm">
        <p className="text-sm font-medium text-blue-400">Bienvenido</p>

        <h1 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
          Sistema de Inventario
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
          Este panel será la base para cargar inventario diario, importar el PDF
          oficial, revisar categorías y hacer el conteo físico desde el
          teléfono.
        </p>
      </section>

      {/* Tarjetas estado/usuario */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200">
              <User size={24} />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-zinc-400">Usuario actual</p>
              <h2 className="mt-1 text-2xl font-bold text-white">
                {user?.displayName || 'Sin nombre'}
              </h2>
              <p className="mt-2 break-all text-sm text-zinc-400">
                {user?.email || 'Sin correo'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950 text-emerald-400">
              <ShieldCheck size={24} />
            </div>

            <div>
              <p className="text-sm text-zinc-400">Estado del sistema</p>
              <h2 className="mt-1 text-2xl font-bold text-emerald-400">
                Activo
              </h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Login, rutas protegidas e inventario funcionando.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Accesos rápidos */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Accesos rápidos</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Usa estas opciones para avanzar más rápido desde el celular.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/inventario-diario"
            className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 transition hover:border-blue-500 hover:bg-zinc-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
              <ClipboardList size={22} />
            </div>

            <div>
              <p className="font-semibold text-white">Inventario diario</p>
              <p className="text-sm text-zinc-400">
                Captura y consulta inventario.
              </p>
            </div>
          </Link>

          <Link
            to="/productos"
            className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
              <Boxes size={22} />
            </div>

            <div>
              <p className="font-semibold text-white">Productos y categorías</p>
              <p className="text-sm text-zinc-400">Administra catálogo base.</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
