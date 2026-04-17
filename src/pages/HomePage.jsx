import {
  User,
  ShieldCheck,
  ClipboardList,
  Boxes,
  History,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function QuickActionCard({ to, icon, title, description, primary = false }) {
  return (
    <Link
      to={to}
      className={[
        'group rounded-2xl border p-4 transition',
        primary
          ? 'border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/15'
          : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            'flex h-11 w-11 items-center justify-center rounded-xl',
            primary
              ? 'bg-blue-600/20 text-blue-300'
              : 'bg-zinc-800 text-zinc-200',
          ].join(' ')}
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

function MiniStatus({ icon, label, value, tone = 'default' }) {
  const toneClasses =
    tone === 'success'
      ? 'bg-emerald-600/10 text-emerald-300'
      : tone === 'info'
        ? 'bg-blue-600/10 text-blue-300'
        : 'bg-zinc-800 text-zinc-200';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
          <p className="truncate font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, title, description }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-2 text-blue-400">
        <CheckCircle2 size={16} />
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">
          Paso {step}
        </p>
      </div>

      <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Cabecera principal */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 lg:p-7">
        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr] xl:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/60 bg-blue-950/40 px-3 py-1 text-xs font-medium text-blue-300">
              <ShieldCheck size={14} />
              Panel principal
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
              Sistema de Inventario
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              Entra al inventario diario, revisa productos o consulta historial
              sin perder tiempo entre pantallas innecesarias.
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

          <div className="grid gap-3">
            <MiniStatus
              icon={<User size={18} />}
              label="Usuario"
              value={userName}
              tone="default"
            />
            <MiniStatus
              icon={<ShieldCheck size={18} />}
              label="Estado"
              value="Sistema activo"
              tone="success"
            />
            <MiniStatus
              icon={<ClipboardList size={18} />}
              label="Siguiente acción"
              value="Trabajar inventario diario"
              tone="info"
            />
          </div>
        </div>
      </section>

      {/* Acciones principales */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Acceso rápido</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Estas son las áreas que realmente vas a usar más seguido.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <QuickActionCard
            to="/inventario-diario"
            icon={<ClipboardList size={22} />}
            title="Inventario diario"
            description="Captura, corrige y continúa el conteo físico del día."
            primary
          />

          <QuickActionCard
            to="/productos"
            icon={<Boxes size={22} />}
            title="Productos y categorías"
            description="Revisa estructura base, productos y organización."
          />

          <QuickActionCard
            to="/historial"
            icon={<History size={22} />}
            title="Historial de inventarios"
            description="Consulta inventarios anteriores y revisa seguimiento."
          />
        </div>
      </section>

      {/* Flujo real */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Orden recomendado</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Así debería usarse el sistema para trabajar más rápido y con menos
            errores.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <StepCard
            step="1"
            title="Revisar productos"
            description="Valida que el catálogo y las categorías estén correctos antes de contar."
          />

          <StepCard
            step="2"
            title="Trabajar inventario diario"
            description="Captura cantidades, estados y observaciones del conteo físico."
          />

          <StepCard
            step="3"
            title="Consultar historial"
            description="Revisa inventarios guardados para comparar cambios y seguimiento."
          />
        </div>
      </section>
    </div>
  );
}
