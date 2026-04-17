import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Protege rutas privadas.
 * - Mientras la autenticación no está lista, muestra una pantalla de carga estable.
 * - Si no hay usuario autenticado, redirige al login.
 * - Conserva la ruta original para volver después del login.
 * - Optimizado para móvil/iPhone y escritorio.
 */
export default function ProtectedRoute({ children }) {
  const { user, loadingAuth, authReady, isAuthenticated } = useAuth();
  const location = useLocation();

  const isCheckingSession = loadingAuth || !authReady;

  if (isCheckingSession) {
    return (
      <div
        className="
          flex min-h-screen min-h-[100dvh] items-center justify-center
          bg-zinc-950 px-4 text-white
          pt-[max(1rem,env(safe-area-inset-top))]
          pb-[max(1rem,env(safe-area-inset-bottom))]
          pl-[max(1rem,env(safe-area-inset-left))]
          pr-[max(1rem,env(safe-area-inset-right))]
        "
      >
        <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 text-center shadow-2xl backdrop-blur sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-blue-400">
            <Loader2 size={26} className="animate-spin" />
          </div>

          <h2 className="text-lg font-semibold text-white">
            Verificando acceso
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-400 sm:text-base">
            Espera un momento mientras validamos tu sesión.
          </p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <>{children}</>;
}