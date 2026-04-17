import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function getAuthErrorMessage(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (
    code.includes('auth/invalid-email') ||
    code.includes('auth/missing-email')
  ) {
    return 'El correo no es válido.';
  }

  if (
    code.includes('auth/invalid-credential') ||
    code.includes('auth/wrong-password') ||
    code.includes('auth/user-not-found') ||
    code.includes('auth/invalid-login-credentials')
  ) {
    return 'Correo o contraseña incorrectos.';
  }

  if (code.includes('auth/too-many-requests')) {
    return 'Demasiados intentos. Intenta más tarde.';
  }

  if (
    code.includes('auth/network-request-failed') ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout')
  ) {
    return 'No se pudo conectar. Revisa tu internet e inténtalo otra vez.';
  }

  return 'Ocurrió un error de autenticación.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // loadingAuth = se está resolviendo el estado inicial o una acción manual
  const [loadingAuth, setLoadingAuth] = useState(true);

  // authReady = ya terminó la comprobación inicial de Firebase
  const [authReady, setAuthReady] = useState(false);

  // actionLoading = login/logout en curso
  const [actionLoading, setActionLoading] = useState(false);

  // authError = último error general de auth
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!isMounted) return;

        setUser(currentUser || null);
        setAuthReady(true);
        setLoadingAuth(false);
        setAuthError('');
      },
      (error) => {
        console.error('Error al verificar sesión:', error);

        if (!isMounted) return;

        setUser(null);
        setAuthReady(true);
        setLoadingAuth(false);
        setAuthError(getAuthErrorMessage(error));
      }
    );

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword.trim()) {
      throw new Error('Correo y contraseña son obligatorios.');
    }

    setActionLoading(true);
    setAuthError('');

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        cleanPassword
      );

      // No forzamos setUser aquí como fuente de verdad,
      // porque Firebase lo resolverá con onAuthStateChanged.
      return result;
    } catch (error) {
      const friendlyMessage = getAuthErrorMessage(error);
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setActionLoading(true);
    setAuthError('');

    try {
      await signOut(auth);
    } catch (error) {
      const friendlyMessage =
        getAuthErrorMessage(error) || 'No se pudo cerrar sesión.';
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const refreshAuthState = useCallback(() => {
    setLoadingAuth(true);
    setAuthReady(false);
    setAuthError('');
  }, []);

  const value = useMemo(
    () => ({
      user,
      loadingAuth,
      authReady,
      actionLoading,
      authError,
      isAuthenticated: !!user,
      login,
      logout,
      refreshAuthState,
    }),
    [
      user,
      loadingAuth,
      authReady,
      actionLoading,
      authError,
      login,
      logout,
      refreshAuthState,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }

  return context;
}
