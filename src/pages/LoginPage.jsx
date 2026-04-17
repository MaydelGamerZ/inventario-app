import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LockKeyhole,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { loginWithEmail } from '../services/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getFriendlyErrorMessage(error) {
  const rawCode = String(error?.code || '').toLowerCase();
  const rawMessage = String(error?.message || '').toLowerCase();

  if (
    rawCode.includes('auth/invalid-credential') ||
    rawCode.includes('auth/wrong-password') ||
    rawCode.includes('auth/user-not-found') ||
    rawCode.includes('auth/invalid-email')
  ) {
    return 'Correo o contraseña incorrectos.';
  }

  if (
    rawCode.includes('auth/too-many-requests') ||
    rawMessage.includes('too many requests')
  ) {
    return 'Demasiados intentos. Espera un momento e inténtalo otra vez.';
  }

  if (
    rawCode.includes('auth/network-request-failed') ||
    rawMessage.includes('network') ||
    rawMessage.includes('fetch') ||
    rawMessage.includes('timeout')
  ) {
    return 'No se pudo conectar en este momento. Revisa tu internet e intenta otra vez.';
  }

  return 'No se pudo iniciar sesión. Intenta nuevamente.';
}

/**
 * Pantalla de inicio de sesión.
 * - Solo permite acceso con correo y contraseña.
 * - Si ya existe una sesión activa, redirige al inicio.
 * - Optimizada para móvil/iPhone y escritorio.
 * - Fuerza redirección inmediata después del login exitoso.
 */
export default function LoginPage() {
  const { user, loadingAuth, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const statePath = location.state?.from?.pathname;
    if (typeof statePath === 'string' && statePath.trim()) {
      return statePath;
    }
    return '/';
  }, [location.state]);

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [didSubmitSuccessfully, setDidSubmitSuccessfully] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage('');
    }
  }

  useEffect(() => {
    if (!authReady) return;
    if (!user) return;

    navigate(redirectTo, { replace: true });
  }, [user, authReady, navigate, redirectTo]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (loadingEmail) return;

    setErrorMessage('');

    const email = normalizeEmail(form.email);
    const password = String(form.password || '');

    if (!email || !password.trim()) {
      setErrorMessage('Completa correo y contraseña.');
      return;
    }

    try {
      setLoadingEmail(true);
      setDidSubmitSuccessfully(false);

      await loginWithEmail(email, password);

      setDidSubmitSuccessfully(true);

      // Redirección inmediata para evitar depender solo del rerender del contexto
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error(error);
      setErrorMessage(getFriendlyErrorMessage(error));
      setDidSubmitSuccessfully(false);
    } finally {
      setLoadingEmail(false);
    }
  }

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
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-zinc-300 shadow-xl">
          <Loader2 size={18} className="animate-spin" />
          <span>Cargando sesión...</span>
        </div>
      </div>
    );
  }

  if (authReady && user) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <main
      className="
        flex min-h-screen min-h-[100dvh] items-center justify-center
        bg-zinc-950 px-4 py-8 text-white sm:px-6 sm:py-10
        pt-[max(2rem,env(safe-area-inset-top))]
        pb-[max(2rem,env(safe-area-inset-bottom))]
        pl-[max(1rem,env(safe-area-inset-left))]
        pr-[max(1rem,env(safe-area-inset-right))]
      "
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="border-b border-zinc-800 px-6 py-6 sm:px-8 sm:py-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-400">
            <LockKeyhole size={26} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Sistema de Inventario
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-400 sm:text-base">
            Inicia sesión con tu correo y contraseña para entrar al panel.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Correo
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 transition focus-within:border-blue-500">
                <Mail size={18} className="shrink-0 text-zinc-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={form.email}
                  onChange={handleChange}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                  disabled={loadingEmail}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Contraseña
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 transition focus-within:border-blue-500">
                <LockKeyhole size={18} className="shrink-0 text-zinc-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                  disabled={loadingEmail}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="shrink-0 text-zinc-400 transition hover:text-white"
                  aria-label={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  disabled={loadingEmail}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-800 bg-red-950/70 px-4 py-3 text-sm text-red-300">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingEmail || (didSubmitSuccessfully && !!user)}
              className="
                inline-flex min-h-[50px] w-full items-center justify-center gap-2
                rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white
                transition hover:bg-blue-500 active:scale-[0.99]
                disabled:cursor-not-allowed disabled:opacity-60
              "
            >
              {loadingEmail ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
            <p className="text-xs leading-5 text-zinc-500 sm:text-sm">
              Acceso restringido. Usa únicamente la cuenta autorizada para este
              sistema.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
