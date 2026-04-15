import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase.js";

/**
 * Signs in a user using email and password.
 * @param {string} email
 * @param {string} password
 */
export async function loginWithEmail(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

/**
 * Signs in a user with Google popup.
 */
export async function loginWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

/**
 * Signs out the currently authenticated user.
 */
export async function logoutUser() {
  return await signOut(auth);
}