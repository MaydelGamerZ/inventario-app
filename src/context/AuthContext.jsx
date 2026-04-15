import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase.js";

// Create a React context to share authentication state and utility values.
const AuthContext = createContext(null);

/**
 * Provider component that keeps track of the current Firebase auth user.
 * It listens for authentication state changes and updates its context value.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // Subscribe to auth changes (login/logout).
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoadingAuth(false);
    });

    // Clean up the listener on unmount.
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => {
    return {
      user,
      loadingAuth,
      isAuthenticated: !!user,
    };
  }, [user, loadingAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access the authentication context. Throws an error if used
 * outside the AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}