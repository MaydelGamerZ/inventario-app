import { db } from "../firebase.js";
import {
  ref,
  push,
  get,
  query,
  orderByChild,
  equalTo,
  update,
} from "firebase/database";

/**
 * Returns the current date as a string in YYYY-MM-DD format.
 */
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Retrieves the inventory record for a given date or null if none exists.
 * @param {string} date - Date in YYYY-MM-DD format.
 */
export async function getInventoryByDate(date) {
  const inventariosRef = ref(db, "inventarios");
  const inventariosQuery = query(
    inventariosRef,
    orderByChild("fecha"),
    equalTo(date)
  );
  const snapshot = await get(inventariosQuery);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.val();
  const firstKey = Object.keys(data)[0];
  return {
    id: firstKey,
    ...data[firstKey],
  };
}

/**
 * Creates a new inventory record for today. Throws an error if one already exists.
 * The user who creates it is stored in the record.
 * @param {object|null} user - The currently logged-in Firebase user.
 */
export async function createTodayInventory(user) {
  const today = getTodayDateString();
  const existingInventory = await getInventoryByDate(today);
  if (existingInventory) {
    throw new Error("Ya existe un inventario para hoy.");
  }
  const inventariosRef = ref(db, "inventarios");
  const newInventory = {
    fecha: today,
    semana: "",
    cedis: "",
    estado: "abierto",
    origen: "manual",
    totalCategorias: 0,
    totalProductos: 0,
    creadoEn: new Date().toISOString(),
    creadoPor: {
      uid: user?.uid || "",
      nombre: user?.displayName || "",
      email: user?.email || "",
    },
    actualizadoEn: new Date().toISOString(),
  };
  const newRef = await push(inventariosRef, newInventory);
  return {
    id: newRef.key,
    ...newInventory,
  };
}

/**
 * Retrieves all inventories sorted by descending date.
 */
export async function getAllInventories() {
  const inventariosRef = ref(db, "inventarios");
  const snapshot = await get(inventariosRef);
  if (!snapshot.exists()) {
    return [];
  }
  const data = snapshot.val();
  const inventories = Object.entries(data).map(([id, value]) => ({
    id,
    ...value,
  }));
  inventories.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return inventories;
}

/**
 * Retrieves a single inventory by its Firebase key (inventoryId).
 * @param {string} inventoryId
 */
export async function getInventoryById(inventoryId) {
  const inventoryRef = ref(db, `inventarios/${inventoryId}`);
  const snapshot = await get(inventoryRef);
  if (!snapshot.exists()) {
    return null;
  }
  return {
    id: inventoryId,
    ...snapshot.val(),
  };
}

/**
 * Updates an inventory with basic data like semana, cedis and estado.
 * Adds a timestamp for when the update occurred.
 * @param {string} inventoryId
 * @param {object} payload
 */
export async function updateInventoryBasicData(inventoryId, payload) {
  const inventoryRef = ref(db, `inventarios/${inventoryId}`);
  await update(inventoryRef, {
    ...payload,
    actualizadoEn: new Date().toISOString(),
  });
}