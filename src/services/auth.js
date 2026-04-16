import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase.js';

/**
 * Inicia sesión con correo y contraseña.
 * @param {string} email
 * @param {string} password
 */
export async function loginWithEmail(email, password) {
  if (!email || !password) {
    throw new Error('Correo y contraseña son obligatorios.');
  }

  return await signInWithEmailAndPassword(auth, email, password);
}

/**
 * Cierra la sesión del usuario actual.
 */
export async function logoutUser() {
  return await signOut(auth);
}
