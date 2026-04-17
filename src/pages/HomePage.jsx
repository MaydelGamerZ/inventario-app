import {
  User,
  ShieldCheck,
  ClipboardList,
  Boxes,
  History,
  FileText,
  ChevronRight,
  Sparkles,
  Smartphone,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function QuickAccessCard({
  to,
  icon,
  title,
  description,
  accent = 'default',
  isDisabled = false,
}) {
  const accentClasses =
    accent === 'blue'
      ? 'text-blue-400 bg-blue-600/15 group-hover:border-blue-500'
      : accent === 'emerald'
        ? 'text-emerald-400 bg-emerald-600/15 group-hover:border-emerald-500'
        : accent === 'yellow'
          ? 'text-yellow-400 bg-yellow-600/15 group-hover:border-yellow-500'
          : 'text-zinc-300 bg-zinc-800 group-hover:border-zinc-600';

  if (isDisabled) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 p-4 opacity-90">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${accentClasses}`}
          >
            {icon}
          </div>
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
            Próximamente
          </span>
        </div>

        <div className="mt-4">
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:bg-zinc-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${accentClasses}`}
        >
          {icon}
        </div>

        <ChevronRight
          size={18}
          className="text-zinc-500 transition group-hover:translate-x-1 group-hover:text-white"
        />
      </div>

      <div className="mt-4">
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p>
      </div>
    </Link>
  );
}

function StatusBadge({ children, tone = 'default' }) {
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-900/60 bg-emerald-950/50 text-emerald-400'
      : tone === 'info'
        ? 'border-blue-900/60 bg-blue-950/50 text-blue-300'
        : 'border-zinc-800 bg-zinc-900 text-zinc-300';

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${toneClasses}`}
    >
      {children}
    </span>
  );
}

export default function HomePage() {
  const { user } = useAuth();

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Hero principal */}
      <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6 lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/60 bg-blue-950/40 px-3 py-1 text-xs font-medium text-blue-300">
              <Sparkles size={14} />
              Panel principal
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              Sistema de Inventario
            </h1>

            <p className="mt-3 text-sm leading-7 text-zinc-400 sm:text-base">
              Desde aquí puedes entrar al inventario diario, revisar productos,
              consultar historial y trabajar más rápido desde teléfono o
              computadora sin perder el flujo del conteo.
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

              <Link
                to="/historial"
                className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 active:scale-[0.98]"
              >
                Ver historial
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-400">Resumen rápido</p>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-zinc-900 p-2 text-blue-400">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Usuario
                    </p>
                    <p className="truncate font-semibold text-white">
                      {userName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-950 p-2 text-emerald-400">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Estado
                    </p>
                    <p className="font-semibold text-white">Sistema activo</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-zinc-900 p-2 text-zinc-300">
                    <Smartphone size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Uso recomendado
                    </p>
                    <p className="font-semibold text-white">
                      Teléfono y escritorio
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tarjetas usuario / sistema */}
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

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge tone="success">Sesión iniciada</StatusBadge>
                <StatusBadge tone="info">Acceso autorizado</StatusBadge>
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
                Login, rutas protegidas e inventario base listos para trabajar.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300">
                  Auth lista
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300">
                  App web móvil
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300">
                  Inventario diario
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300">
                  Historial listo
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
            Entra rápido a las pantallas más usadas del sistema.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAccessCard
            to="/inventario-diario"
            icon={<ClipboardList size={22} />}
            title="Inventario diario"
            description="Captura, revisa y continúa el conteo físico del día."
            accent="blue"
          />

          <QuickAccessCard
            to="/productos"
            icon={<Boxes size={22} />}
            title="Productos y categorías"
            description="Administra el inventario base, productos y estructura."
            accent="default"
          />

          <QuickAccessCard
            to="/historial"
            icon={<History size={22} />}
            title="Historial"
            description="Consulta inventarios guardados y revisa fechas anteriores."
            accent="default"
          />

          <QuickAccessCard
            to="#"
            icon={<FileText size={22} />}
            title="Importación PDF"
            description="Espacio preparado para conectar la carga del archivo oficial."
            accent="yellow"
            isDisabled
          />
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
            <div className="flex items-center gap-2 text-blue-400">
              <CheckCircle2 size={16} />
              <p className="text-xs font-semibold uppercase tracking-wider">
                Paso 1
              </p>
            </div>

            <h3 className="mt-2 text-base font-semibold text-white">
              Revisar catálogo
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Verifica productos y categorías antes de contar o corregir.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-blue-400">
              <CalendarDays size={16} />
              <p className="text-xs font-semibold uppercase tracking-wider">
                Paso 2
              </p>
            </div>

            <h3 className="mt-2 text-base font-semibold text-white">
              Trabajar el inventario diario
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Captura cantidades, observaciones y avanza con el conteo físico.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-blue-400">
              <History size={16} />
              <p className="text-xs font-semibold uppercase tracking-wider">
                Paso 3
              </p>
            </div>

            <h3 className="mt-2 text-base font-semibold text-white">
              Consultar historial
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Revisa inventarios guardados para validar cambios y seguimiento.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
