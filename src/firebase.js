import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Firebase configuration for your project. Replace databaseURL with your own
// Realtime Database URL if needed.
const firebaseConfig = {
  apiKey: "AIzaSyBKNi2wRe89QxR3KBXxxFce-Fnjrw2-PmU",
  authDomain: "inventario-7aea1.firebaseapp.com",
  databaseURL: "https://inventario-7aea1-default-rtdb.firebaseio.com",
  projectId: "inventario-7aea1",
  storageBucket: "inventario-7aea1.firebasestorage.app",
  messagingSenderId: "297617050305",
  appId: "1:297617050305:web:48b832568ef45efaf1a240",
  measurementId: "G-W4PPZPNBSL",
};

// Initialize Firebase and export the main services used throughout the app.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };