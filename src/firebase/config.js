// src/firebase/config.js

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAyvzt6qnGxX792cCFZNW0DDmExNyXG6Rg",
  authDomain: "inventario-8f5d2.firebaseapp.com",
  databaseURL: "https://inventario-8f5d2-default-rtdb.firebaseio.com",
  projectId: "inventario-8f5d2",
  storageBucket: "inventario-8f5d2.firebasestorage.app",
  messagingSenderId: "914289922378",
  appId: "1:914289922378:web:ce81e379452355840371b3",
  measurementId: "G-EZ8GE1LS4B"
};

const app = initializeApp(firebaseConfig);

export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getDatabase(app);