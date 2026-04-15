import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  onSnapshot, // Se importa onSnapshot para escuchar cambios en tiempo real
} from 'firebase/firestore';
import { db } from '../firebase';

const inventoriesRef = collection(db, 'inventories');
const categoriesRef = collection(db, 'categories');
const productsRef = collection(db, 'products');

/* =========================
   UTILIDADES
========================= */
function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/* =========================
   INVENTARIOS
========================= */

// Obtiene todos los inventarios (ordenados por fecha)
export async function getAllInventories() {
  const q = query(inventoriesRef, orderBy('dateKey', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

// Obtiene un inventario por ID (lectura puntual)
export async function getInventoryById(inventoryId) {
  if (!inventoryId) return null;

  const ref = doc(db, 'inventories', inventoryId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

// Obtiene el inventario de una fecha específica (lectura puntual)
export async function getInventoryByDate(dateKey) {
  const normalizedDateKey = safeString(dateKey);

  if (!normalizedDateKey) {
    return null;
  }

  const q = query(
    inventoriesRef,
    where('dateKey', '==', normalizedDateKey),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const firstDoc = snapshot.docs[0];

  return {
    id: firstDoc.id,
    ...firstDoc.data(),
  };
}

// Crea un nuevo inventario
export async function createInventory(data) {
  const payload = {
    date: safeString(data.date),
    dateKey: safeString(data.dateKey),
    week: safeString(data.week),
    cedis: safeString(data.cedis),
    status: safeString(data.status) || 'Abierto',
    sourceType: safeString(data.sourceType) || 'manual',
    sourceFileName: safeString(data.sourceFileName),
    importedByEmail: safeString(data.importedByEmail),
    notes: safeString(data.notes),
    totals: {
      totalGeneral: safeNumber(data.totals?.totalGeneral),
      totalGeneralNoDisponible: safeNumber(
        data.totals?.totalGeneralNoDisponible
      ),
      productCount: safeNumber(data.totals?.productCount),
      categoryCount: safeNumber(data.totals?.categoryCount),
    },
    categories: safeArray(data.categories),
    items: safeArray(data.items),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    importedAt: serverTimestamp(),
  };

  const docRef = await addDoc(inventoriesRef, payload);
  return docRef.id;
}

// Actualiza un inventario existente (campo a campo)
export async function updateInventory(inventoryId, data) {
  const normalizedId = safeString(inventoryId);

  if (!normalizedId) {
    throw new Error('No se recibió el id del inventario.');
  }

  const ref = doc(db, 'inventories', normalizedId);

  const payload = {
    date: safeString(data.date),
    dateKey: safeString(data.dateKey),
    week: safeString(data.week),
    cedis: safeString(data.cedis),
    status: safeString(data.status) || 'Abierto',
    sourceType: safeString(data.sourceType) || 'manual',
    sourceFileName: safeString(data.sourceFileName),
    importedByEmail: safeString(data.importedByEmail),
    notes: safeString(data.notes),
    totals: {
      totalGeneral: safeNumber(data.totals?.totalGeneral),
      totalGeneralNoDisponible: safeNumber(
        data.totals?.totalGeneralNoDisponible
      ),
      productCount: safeNumber(data.totals?.productCount),
      categoryCount: safeNumber(data.totals?.categoryCount),
    },
    categories: safeArray(data.categories),
    items: safeArray(data.items),
    updatedAt: serverTimestamp(),
    importedAt: serverTimestamp(),
  };

  await updateDoc(ref, payload);
}

// Guarda un inventario proveniente de un PDF. Si ya existe un inventario con la misma fecha, lo actualiza.
export async function saveDailyInventoryFromPdf(
  parsedInventory,
  userEmail = ''
) {
  const dateKey = safeString(parsedInventory?.dateKey);

  if (!dateKey) {
    throw new Error('El PDF no tiene una fecha válida.');
  }

  const existingInventory = await getInventoryByDate(dateKey);

  const payload = {
    date: safeString(parsedInventory?.dateLabel),
    dateKey,
    week: safeString(parsedInventory?.week),
    cedis: safeString(parsedInventory?.cedis),
    status: 'Abierto',
    sourceType: 'pdf',
    sourceFileName: safeString(parsedInventory?.sourceFileName),
    importedByEmail: safeString(userEmail),
    notes: '',
    totals: {
      totalGeneral: safeNumber(parsedInventory?.totalGeneral),
      totalGeneralNoDisponible: safeNumber(
        parsedInventory?.totalGeneralNoDisponible
      ),
      productCount: safeArray(parsedInventory?.items).length,
      categoryCount: safeArray(parsedInventory?.categories).length,
    },
    categories: safeArray(parsedInventory?.categories),
    items: safeArray(parsedInventory?.items),
  };

  if (existingInventory) {
    await updateInventory(existingInventory.id, payload);
    return await getInventoryById(existingInventory.id);
  }

  const newInventoryId = await createInventory(payload);
  return await getInventoryById(newInventoryId);
}

/**
 * Guarda los detalles de inventario (incluyendo countEntries) y conserva notas.
 * Almacena los conteos en el campo "countEntries" para cada producto.
 */
export async function saveInventoryDetail(inventoryId, items, notes = '') {
  const currentInventory = await getInventoryById(inventoryId);

  if (!currentInventory) {
    throw new Error('Inventario no encontrado.');
  }

  // Normaliza cada item y conserva su historial de conteos
  const normalizedItems = safeArray(items).map((item) => {
    const expectedQuantity = safeNumber(item.expectedQuantity);
    const unavailableQuantity = safeNumber(item.unavailableQuantity);
    const countedQuantity =
      item.countedQuantity === '' ||
      item.countedQuantity === null ||
      item.countedQuantity === undefined
        ? ''
        : safeNumber(item.countedQuantity);

    const total =
      item.total === '' || item.total === null || item.total === undefined
        ? ''
        : safeNumber(item.total);

    const difference =
      item.difference === '' ||
      item.difference === null ||
      item.difference === undefined
        ? ''
        : safeNumber(item.difference);

    // Sanitizamos countEntries para incluir todos los conteos
    const countEntries = safeArray(item.countEntries).map((entry) => ({
      id:
        safeString(entry.id) ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      quantity:
        entry.quantity === '' ||
        entry.quantity === null ||
        entry.quantity === undefined
          ? 0
          : safeNumber(entry.quantity),
      comment: safeString(entry.comment),
      observationType: safeString(entry.observationType) || 'Buen estado',
      createdAt: safeString(entry.createdAt),
    }));

    return {
      productName: safeString(item.productName),
      categoryName: safeString(item.categoryName),
      categoryCode: safeString(item.categoryCode),
      categoryRaw: safeString(item.categoryRaw),
      supplierName: safeString(item.supplierName),
      supplierCode: safeString(item.supplierCode),
      expectedQuantity,
      unavailableQuantity,
      countedQuantity,
      total,
      difference,
      observation: safeString(item.observation),
      status: safeString(item.status) || 'OK',
      countEntries, // Conservamos los conteos en la BD
    };
  });

  await updateInventory(inventoryId, {
    ...currentInventory,
    items: normalizedItems,
    notes: safeString(notes),
  });

  return await getInventoryById(inventoryId);
}

/* =========================
   SUSCRIPCIONES EN TIEMPO REAL
========================= */

/**
 * Escucha cambios en todos los inventarios. Devuelve una función para cancelar.
 * @param {(inventories: any[]) => void} callback
 */
export function subscribeAllInventories(callback) {
  const q = query(inventoriesRef, orderBy('dateKey', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const inventories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(inventories);
  });
}

/**
 * Escucha cambios en un inventario por id. Devuelve una función para cancelar.
 * @param {string} inventoryId
 * @param {(data: any|null) => void} callback
 */
export function subscribeInventoryById(inventoryId, callback) {
  const normalizedId = safeString(inventoryId);
  if (!normalizedId) {
    callback(null);
    return () => {};
  }
  const ref = doc(db, 'inventories', normalizedId);
  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({
      id: snapshot.id,
      ...snapshot.data(),
    });
  });
}

/**
 * Escucha el inventario de una fecha específica (por dateKey). Devuelve una función para cancelar.
 * @param {string} dateKey
 * @param {(data: any|null) => void} callback
 */
export function subscribeInventoryByDate(dateKey, callback) {
  const normalizedDateKey = safeString(dateKey);
  if (!normalizedDateKey) {
    callback(null);
    return () => {};
  }
  const q = query(
    inventoriesRef,
    where('dateKey', '==', normalizedDateKey),
    limit(1)
  );
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const docSnapshot = snapshot.docs[0];
    callback({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    });
  });
}

/* =========================
   CATEGORÍAS
========================= */
export async function getCategories() {
  const q = query(categoriesRef, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function createCategory(data) {
  const name = safeString(data.name);

  if (!name) {
    throw new Error('La categoría necesita nombre.');
  }

  const payload = {
    name,
    description: safeString(data.description),
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(categoriesRef, payload);
  return docRef.id;
}

export async function deleteCategory(categoryId) {
  const normalizedId = safeString(categoryId);

  if (!normalizedId) {
    throw new Error('No se recibió el id de la categoría.');
  }

  await deleteDoc(doc(db, 'categories', normalizedId));
}

/* =========================
   PRODUCTOS
========================= */
export async function getProducts() {
  const q = query(productsRef, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function createProduct(data) {
  const name = safeString(data.name);

  if (!name) {
    throw new Error('El producto necesita nombre.');
  }

  const payload = {
    name,
    categoryId: safeString(data.categoryId),
    categoryName: safeString(data.categoryName),
    presentation: safeString(data.presentation),
    weight: safeString(data.weight),
    sku: safeString(data.sku),
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(productsRef, payload);
  return docRef.id;
}

export async function deleteProduct(productId) {
  const normalizedId = safeString(productId);

  if (!normalizedId) {
    throw new Error('No se recibió el id del producto.');
  }

  await deleteDoc(doc(db, 'products', normalizedId));
}