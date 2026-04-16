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
  onSnapshot,
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

export async function getAllInventories() {
  const q = query(inventoriesRef, orderBy('dateKey', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function getInventoryById(inventoryId) {
  if (!inventoryId) return null;

  const ref = doc(db, 'inventories', inventoryId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function getInventoryByDate(dateKey) {
  const normalizedDateKey = safeString(dateKey);
  if (!normalizedDateKey) return null;

  const q = query(
    inventoriesRef,
    where('dateKey', '==', normalizedDateKey),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];

  return {
    id: docSnap.id,
    ...docSnap.data(),
  };
}

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
  };

  const docRef = await addDoc(inventoriesRef, payload);
  return docRef.id;
}

/**
 * ⚠️ ACTUALIZACIÓN SEGURA (no pisa todo)
 */
export async function updateInventory(inventoryId, data) {
  const id = safeString(inventoryId);
  if (!id) throw new Error('ID inválido');

  const ref = doc(db, 'inventories', id);

  const payload = {
    date: safeString(data.date),
    dateKey: safeString(data.dateKey),
    week: safeString(data.week),
    cedis: safeString(data.cedis),
    status: safeString(data.status) || 'Abierto',
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
  };

  await updateDoc(ref, payload);
}

/**
 * Guardar desde PDF
 */
export async function saveDailyInventoryFromPdf(parsed, userEmail = '') {
  const dateKey = safeString(parsed?.dateKey);
  if (!dateKey) throw new Error('Fecha inválida en PDF');

  const existing = await getInventoryByDate(dateKey);

  const payload = {
    date: safeString(parsed?.dateLabel),
    dateKey,
    week: safeString(parsed?.week),
    cedis: safeString(parsed?.cedis),
    status: 'Abierto',
    sourceType: 'pdf',
    sourceFileName: safeString(parsed?.sourceFileName),
    importedByEmail: safeString(userEmail),

    totals: {
      totalGeneral: safeNumber(parsed?.totalGeneral),
      totalGeneralNoDisponible: safeNumber(
        parsed?.totalGeneralNoDisponible
      ),
      productCount: safeArray(parsed?.items).length,
      categoryCount: safeArray(parsed?.categories).length,
    },

    categories: safeArray(parsed?.categories),
    items: safeArray(parsed?.items),
  };

  if (existing) {
    await updateInventory(existing.id, payload);
    return await getInventoryById(existing.id);
  }

  const id = await createInventory(payload);
  return await getInventoryById(id);
}

/**
 * Guarda conteos
 */
export async function saveInventoryDetail(inventoryId, items, notes = '') {
  const inv = await getInventoryById(inventoryId);
  if (!inv) throw new Error('Inventario no encontrado');

  const normalizedItems = safeArray(items).map((item) => ({
    productName: safeString(item.productName),
    categoryName: safeString(item.categoryName),
    supplierName: safeString(item.supplierName),

    expectedQuantity: safeNumber(item.expectedQuantity),
    unavailableQuantity: safeNumber(item.unavailableQuantity),

    countedQuantity:
      item.countedQuantity === '' ? '' : safeNumber(item.countedQuantity),

    observation: safeString(item.observation),
    status: safeString(item.status) || 'OK',

    countEntries: safeArray(item.countEntries).map((entry) => ({
      id: safeString(entry.id) || `${Date.now()}`,
      quantity: safeNumber(entry.quantity),
      comment: safeString(entry.comment),
      observationType:
        safeString(entry.observationType) || 'Buen estado',
      createdAt: entry.createdAt || new Date().toISOString(),
    })),
  }));

  await updateInventory(inventoryId, {
    ...inv,
    items: normalizedItems,
    notes: safeString(notes),
  });

  return await getInventoryById(inventoryId);
}

/* =========================
   SUSCRIPCIONES
========================= */

export function subscribeAllInventories(callback) {
  const q = query(inventoriesRef, orderBy('dateKey', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(data);
    },
    (error) => {
      console.error('Error en subscribeAllInventories:', error);
      callback([]);
    }
  );
}

export function subscribeInventoryById(id, callback) {
  const ref = doc(db, 'inventories', id);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return callback(null);
      callback({ id: snap.id, ...snap.data() });
    },
    (error) => {
      console.error('Error en subscribeInventoryById:', error);
      callback(null);
    }
  );
}

export function subscribeInventoryByDate(dateKey, callback) {
  const q = query(
    inventoriesRef,
    where('dateKey', '==', safeString(dateKey)),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) return callback(null);
      const docSnap = snapshot.docs[0];
      callback({ id: docSnap.id, ...docSnap.data() });
    },
    (error) => {
      console.error('Error en subscribeInventoryByDate:', error);
      callback(null);
    }
  );
}