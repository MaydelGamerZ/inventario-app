import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-3xl font-bold">Home</h2>
        <p className="mt-2 text-zinc-400">
          Bienvenido al sistema de inventario.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Usuario actual</p>
          <h3 className="mt-2 text-lg font-semibold">
            {user?.displayName || 'Sin nombre'}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">{user?.email}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Estado del sistema</p>
          <h3 className="mt-2 text-lg font-semibold text-green-400">Activo</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Login y rutas protegidas funcionando.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Siguiente módulo</p>
          <h3 className="mt-2 text-lg font-semibold">Inventario Diario</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Será la siguiente pantalla que construiremos.
          </p>
        </div>
      </section>
    </div>
  );
}
