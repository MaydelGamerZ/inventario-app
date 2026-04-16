import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    let resolved = false;

    const safetyTimer = setTimeout(() => {
      if (!mountedRef.current || resolved) return;

      resolved = true;
      setAuthReady(true);
      setLoadingAuth(false);
    }, 7000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!mountedRef.current || resolved) return;

        resolved = true;
        clearTimeout(safetyTimer);

        setUser(currentUser || null);
        setAuthReady(true);
        setLoadingAuth(false);
      },
      (error) => {
        console.error('Error al verificar sesión:', error);

        if (!mountedRef.current || resolved) return;

        resolved = true;
        clearTimeout(safetyTimer);

        setUser(null);
        setAuthReady(true);
        setLoadingAuth(false);
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      unsubscribe?.();
    };
  }, []);

  const login = async (email, password) => {
    const cleanEmail = String(email || '').trim();
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Correo y contraseña son obligatorios.');
    }

    return await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
  };

  const logout = async () => {
    return await signOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      loadingAuth,
      authReady,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user, loadingAuth, authReady]
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
