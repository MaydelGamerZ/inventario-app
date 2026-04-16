import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Protege rutas privadas.
 * - Mientras se valida la sesión, muestra una pantalla de carga optimizada
 *   para móvil/iPhone y escritorio.
 * - Si no hay usuario autenticado, redirige al login.
 */
export default function ProtectedRoute({ children }) {
  const { user, loadingAuth } = useAuth();

  if (loadingAuth) {
    return (
      <div
        className="
          flex items-center justify-center
          bg-zinc-950 text-white
          min-h-screen min-h-[100dvh]
          px-4 sm:px-6
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
          pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]
        "
      >
        <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-6 sm:p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 h-12 w-12 sm:h-14 sm:w-14 animate-spin rounded-full border-4 border-zinc-700 border-t-white" />

          <h2 className="text-base sm:text-lg font-semibold text-white">
            Cargando sesión
          </h2>

          <p className="mt-2 text-sm sm:text-base leading-relaxed text-zinc-400">
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
