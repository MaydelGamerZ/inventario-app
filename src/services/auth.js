// src/services/auth.js
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase.js';

/**
 * Normaliza el correo (trim + lowercase)
 */
function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

/**
 * Traduce errores de Firebase a mensajes claros
 */
function parseFirebaseError(error) {
  const code = String(error?.code || '').toLowerCase();

  switch (code) {
    case 'auth/invalid-email':
      return 'El correo no tiene un formato válido.';

    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';

    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta más tarde.';

    case 'auth/network-request-failed':
      return 'Error de conexión. Revisa tu internet.';

    default:
      return 'No se pudo iniciar sesión. Intenta nuevamente.';
  }
}

/**
 * Inicia sesión con correo y contraseña
 */
export async function loginWithEmail(email, password) {
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || '');

  if (!cleanEmail || !cleanPassword.trim()) {
    throw new Error('Correo y contraseña son obligatorios.');
  }

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      cleanEmail,
      cleanPassword
    );

    return result;
  } catch (error) {
    console.error('Error login:', error);
    throw new Error(parseFirebaseError(error));
  }
}

/**
 * Cierra la sesión del usuario actual
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error logout:', error);
    throw new Error('No se pudo cerrar sesión.');
  }
}
