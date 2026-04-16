import {
  User,
  ShieldCheck,
  ClipboardList,
  Boxes,
  History,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { user } = useAuth();

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';

  return (
    <div
      className="
        space-y-4
        pb-[max(1rem,env(safe-area-inset-bottom))]
      "
    >
      {/* Bienvenida */}
      <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium tracking-wide text-blue-400">
            Bienvenido
          </p>

          <h1 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Sistema de Inventario
          </h1>

          <p className="mt-3 text-sm leading-7 text-zinc-400 sm:text-base">
            Este panel será la base para cargar inventario diario, importar el
            PDF oficial, revisar categorías y hacer el conteo físico desde el
            teléfono de forma más ordenada y rápida.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/inventario-diario"
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98]"
            >
              Ir a inventario diario
            </Link>

            <Link
              to="/productos"
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 active:scale-[0.98]"
            >
              Ver productos
            </Link>
          </div>
        </div>
      </section>

      {/* Tarjetas estado/usuario */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200">
              <User size={24} />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-zinc-400">Usuario actual</p>

              <h2 className="mt-1 truncate text-xl font-bold text-white sm:text-2xl">
                {userName}
              </h2>

              <p className="mt-2 break-all text-sm text-zinc-400">
                {user?.email || 'Sin correo'}
              </p>

              <div className="mt-4 inline-flex rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
                Sesión iniciada
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-950 text-emerald-400">
              <ShieldCheck size={24} />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-zinc-400">Estado del sistema</p>

              <h2 className="mt-1 text-xl font-bold text-emerald-400 sm:text-2xl">
                Activo
              </h2>

              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Login, rutas protegidas e inventario base funcionando
                correctamente.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300">
                  Auth lista
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300">
                  App web móvil
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accesos rápidos */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Accesos rápidos</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Usa estas opciones para avanzar más rápido desde el celular.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            to="/inventario-diario"
            className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-blue-500 hover:bg-zinc-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
                <ClipboardList size={22} />
              </div>
              <ChevronRight
                size={18}
                className="text-zinc-500 transition group-hover:translate-x-1 group-hover:text-white"
              />
            </div>

            <div className="mt-4">
              <p className="font-semibold text-white">Inventario diario</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Captura, suma y revisa conteos desde el teléfono.
              </p>
            </div>
          </Link>

          <Link
            to="/productos"
            className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
                <Boxes size={22} />
              </div>
              <ChevronRight
                size={18}
                className="text-zinc-500 transition group-hover:translate-x-1 group-hover:text-white"
              />
            </div>

            <div className="mt-4">
              <p className="font-semibold text-white">Productos y categorías</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Administra el catálogo base y estructura del inventario.
              </p>
            </div>
          </Link>

          <Link
            to="/historial"
            className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
                <History size={22} />
              </div>
              <ChevronRight
                size={18}
                className="text-zinc-500 transition group-hover:translate-x-1 group-hover:text-white"
              />
            </div>

            <div className="mt-4">
              <p className="font-semibold text-white">Historial</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Consulta inventarios guardados por fecha.
              </p>
            </div>
          </Link>

          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
              <FileText size={22} />
            </div>

            <div className="mt-4">
              <p className="font-semibold text-white">Importación PDF</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Espacio listo para conectar la carga del archivo oficial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Flujo recomendado */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Flujo recomendado</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Orden práctico para usar el sistema sin perder tiempo.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Paso 1
            </p>
            <h3 className="mt-2 text-base font-semibold text-white">
              Revisar catálogo
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Verifica productos y categorías antes de capturar.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Paso 2
            </p>
            <h3 className="mt-2 text-base font-semibold text-white">
              Contar inventario
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Registra cantidades y observaciones desde inventario diario.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Paso 3
            </p>
            <h3 className="mt-2 text-base font-semibold text-white">
              Consultar historial
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Revisa lo guardado para validar cambios y seguimiento.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
