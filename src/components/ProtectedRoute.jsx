import { Navigate } from 'react-router-dom';
import { Loader2, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Protege rutas privadas.
 * - Mientras se valida la sesión, muestra una pantalla de carga optimizada.
 * - Si no hay usuario autenticado, redirige al login.
 * - Si auth ya terminó y no hay usuario, no se queda colgado.
 */
export default function ProtectedRoute({ children }) {
  const { user, loadingAuth, authReady } = useAuth();

  if (loadingAuth && !authReady) {
    return (
      <div
        className="
          flex min-h-screen min-h-[100dvh] items-center justify-center
          bg-zinc-950 px-4 text-white
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
          pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]
        "
      >
        <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900/85 p-6 text-center shadow-2xl backdrop-blur sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-white">
            <Loader2 size={26} className="animate-spin" />
          </div>

          <h2 className="text-lg font-semibold text-white">Cargando sesión</h2>

          <p className="mt-2 text-sm leading-6 text-zinc-400 sm:text-base">
            Espera un momento mientras verificamos tu acceso.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
