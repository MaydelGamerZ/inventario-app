import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
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

function safeNullableString(value) {
  const text = safeString(value);
  return text || '';
}

function buildEntryId() {
  return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sumCountEntries(entries = []) {
  return safeArray(entries).reduce(
    (sum, entry) => sum + safeNumber(entry.quantity),
    0
  );
}

function summarizeEntriesByObservation(entries = []) {
  const summary = {};

  for (const entry of safeArray(entries)) {
    const label = safeString(entry.observationType) || 'Buen estado';
    summary[label] = (summary[label] || 0) + safeNumber(entry.quantity);
  }

  return summary;
}

function calculateDifference(expected, counted) {
  return safeNumber(counted) - safeNumber(expected);
}

function calculateItemStatus(item) {
  const counted = safeNumber(item.countedQuantity);
  const expected = safeNumber(item.expectedQuantity);
  const unavailable = safeNumber(item.unavailableQuantity);
  const observationTotals = summarizeEntriesByObservation(item.countEntries);

  if (counted <= 0) return 'FALTANTE';
  if ((observationTotals.Caducado || 0) > 0) return 'CADUCADO';
  if (
    (observationTotals.Dañado || 0) > 0 ||
    (observationTotals.Maltratado || 0) > 0
  ) {
    return 'DAÑADO';
  }
  if (unavailable > 0 || (observationTotals.Exhibición || 0) > 0) {
    return 'ALERTA';
  }
  if (expected <= 0) return 'FALTANTE';

  return 'OK';
}

function normalizeCountEntry(entry) {
  return {
    id: safeString(entry?.id) || buildEntryId(),
    quantity: safeNumber(entry?.quantity),
    comment: safeNullableString(entry?.comment),
    observationType: safeString(entry?.observationType) || 'Buen estado',
    createdAt:
      entry?.createdAt && typeof entry.createdAt === 'string'
        ? entry.createdAt
        : new Date().toISOString(),
    createdBy: safeNullableString(entry?.createdBy),
  };
}

function normalizeInventoryItem(item) {
  const countEntries = safeArray(item?.countEntries).map(normalizeCountEntry);
  const countedQuantity = sumCountEntries(countEntries);
  const difference = calculateDifference(
    item?.expectedQuantity,
    countedQuantity
  );

  const normalized = {
    productName: safeString(item?.productName),
    categoryName: safeString(item?.categoryName),
    categoryCode: safeString(item?.categoryCode),
    categoryRaw: safeString(item?.categoryRaw),
    supplierName: safeString(item?.supplierName),
    supplierCode: safeString(item?.supplierCode),
    expectedQuantity: safeNumber(item?.expectedQuantity),
    unavailableQuantity: safeNumber(item?.unavailableQuantity),
    countedQuantity,
    total: countedQuantity,
    difference,
    observation: safeNullableString(item?.observation),
    countEntries,
    status: 'OK',
  };

  normalized.status =
    calculateItemStatus(normalized) || safeString(item?.status) || 'OK';

  return normalized;
}

function buildTotals(items = [], categories = []) {
  const normalizedItems = safeArray(items).map(normalizeInventoryItem);

  return {
    totalGeneral: normalizedItems.reduce(
      (sum, item) => sum + safeNumber(item.expectedQuantity),
      0
    ),
    totalGeneralNoDisponible: normalizedItems.reduce(
      (sum, item) => sum + safeNumber(item.unavailableQuantity),
      0
    ),
    productCount: normalizedItems.length,
    categoryCount: safeArray(categories).length,
  };
}

function normalizeInventoryPayload(data = {}, options = {}) {
  const items = safeArray(data.items).map(normalizeInventoryItem);
  const categories = safeArray(data.categories);
  const totals = buildTotals(items, categories);

  const payload = {
    date: safeString(data.date),
    dateKey: safeString(data.dateKey),
    week: safeString(data.week),
    cedis: safeString(data.cedis),
    status: safeString(data.status) || 'BORRADOR',
    sourceType: safeString(data.sourceType) || 'manual',
    sourceFileName: safeString(data.sourceFileName),
    importedByEmail: safeString(data.importedByEmail),
    notes: safeNullableString(data.notes),
    categories,
    items,
    totals,
    countingStarted: Boolean(data.countingStarted),
    countingFinished: Boolean(data.countingFinished),
    finalizedAt: data.finalizedAt || null,
    finalizedByEmail: safeNullableString(data.finalizedByEmail),
    lastCountUpdatedAt: data.lastCountUpdatedAt || null,
  };

  if (options.includeTimestamps) {
    payload.createdAt = serverTimestamp();
    payload.updatedAt = serverTimestamp();
  } else {
    payload.updatedAt = serverTimestamp();
  }

  if (options.includeImportedAt) {
    payload.importedAt = serverTimestamp();
  }

  return payload;
}

function isFinalStatus(status) {
  return safeString(status).toUpperCase() === 'GUARDADO';
}

/* =========================
   INVENTARIOS
========================= */

export async function getAllInventories(options = {}) {
  const includeDrafts = Boolean(options.includeDrafts);
  const q = query(inventoriesRef, orderBy('dateKey', 'desc'));
  const snapshot = await getDocs(q);

  const list = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));

  return includeDrafts ? list : list.filter((inv) => isFinalStatus(inv.status));
}

export async function getInventoryById(inventoryId) {
  const normalizedId = safeString(inventoryId);
  if (!normalizedId) return null;

  const ref = doc(db, 'inventories', normalizedId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

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

export async function createInventory(data) {
  const payload = normalizeInventoryPayload(data, {
    includeTimestamps: true,
    includeImportedAt: safeString(data.sourceType) === 'pdf',
  });

  const docRef = await addDoc(inventoriesRef, payload);
  return docRef.id;
}

export async function updateInventory(inventoryId, data) {
  const normalizedId = safeString(inventoryId);

  if (!normalizedId) {
    throw new Error('No se recibió el id del inventario.');
  }

  const ref = doc(db, 'inventories', normalizedId);
  const payload = normalizeInventoryPayload(data);

  await updateDoc(ref, payload);
}

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
    status: existingInventory?.status || 'BORRADOR',
    sourceType: 'pdf',
    sourceFileName: safeString(parsedInventory?.sourceFileName),
    importedByEmail: safeString(userEmail),
    notes: existingInventory?.notes || '',
    categories: safeArray(parsedInventory?.categories),
    items: safeArray(parsedInventory?.items).map((item, index) => {
      const existingItem = safeArray(existingInventory?.items)[index];

      if (!existingItem) {
        return normalizeInventoryItem({
          ...item,
          countEntries: [],
        });
      }

      return normalizeInventoryItem({
        ...item,
        countEntries: safeArray(existingItem.countEntries),
        observation: existingItem.observation || '',
      });
    }),
    countingStarted: Boolean(existingInventory?.countingStarted),
    countingFinished: Boolean(existingInventory?.countingFinished),
    finalizedAt: existingInventory?.finalizedAt || null,
    finalizedByEmail: existingInventory?.finalizedByEmail || '',
    lastCountUpdatedAt: existingInventory?.lastCountUpdatedAt || null,
  };

  if (existingInventory) {
    await updateInventory(existingInventory.id, payload);
    return await getInventoryById(existingInventory.id);
  }

  const newInventoryId = await createInventory(payload);
  return await getInventoryById(newInventoryId);
}

/**
 * Inicia formalmente el conteo.
 * Mantiene el inventario en BORRADOR.
 */
export async function startInventoryCount(inventoryId) {
  const currentInventory = await getInventoryById(inventoryId);

  if (!currentInventory) {
    throw new Error('Inventario no encontrado.');
  }

  await updateInventory(inventoryId, {
    ...currentInventory,
    status: 'BORRADOR',
    countingStarted: true,
    countingFinished: false,
    finalizedAt: null,
    finalizedByEmail: '',
  });

  return await getInventoryById(inventoryId);
}

/**
 * Agrega un conteo en tiempo real.
 */
export async function addInventoryCountEntry(
  inventoryId,
  itemIndex,
  entry,
  actorEmail = ''
) {
  const currentInventory = await getInventoryById(inventoryId);

  if (!currentInventory) {
    throw new Error('Inventario no encontrado.');
  }

  const items = safeArray(currentInventory.items);

  if (itemIndex < 0 || itemIndex >= items.length) {
    throw new Error('Producto no válido para conteo.');
  }

  const updatedItems = items.map((item, index) => {
    if (index !== itemIndex) {
      return normalizeInventoryItem(item);
    }

    const normalizedItem = normalizeInventoryItem(item);

    const nextEntries = [
      ...safeArray(normalizedItem.countEntries),
      normalizeCountEntry({
        ...entry,
        createdBy: safeString(actorEmail),
      }),
    ];

    return normalizeInventoryItem({
      ...normalizedItem,
      countEntries: nextEntries,
    });
  });

  await updateInventory(inventoryId, {
    ...currentInventory,
    items: updatedItems,
    status: 'BORRADOR',
    countingStarted: true,
    countingFinished: false,
    lastCountUpdatedAt: serverTimestamp(),
  });

  return await getInventoryById(inventoryId);
}

/**
 * Elimina un conteo en tiempo real.
 */
export async function removeInventoryCountEntry(
  inventoryId,
  itemIndex,
  entryId
) {
  const currentInventory = await getInventoryById(inventoryId);

  if (!currentInventory) {
    throw new Error('Inventario no encontrado.');
  }

  const items = safeArray(currentInventory.items);

  if (itemIndex < 0 || itemIndex >= items.length) {
    throw new Error('Producto no válido para conteo.');
  }

  const normalizedEntryId = safeString(entryId);

  if (!normalizedEntryId) {
    throw new Error('No se recibió el id del conteo.');
  }

  const updatedItems = items.map((item, index) => {
    if (index !== itemIndex) {
      return normalizeInventoryItem(item);
    }

    const normalizedItem = normalizeInventoryItem(item);

    const nextEntries = safeArray(normalizedItem.countEntries).filter(
      (entry) => safeString(entry.id) !== normalizedEntryId
    );

    return normalizeInventoryItem({
      ...normalizedItem,
      countEntries: nextEntries,
    });
  });

  await updateInventory(inventoryId, {
    ...currentInventory,
    items: updatedItems,
    status: 'BORRADOR',
    countingStarted: true,
    countingFinished: false,
    lastCountUpdatedAt: serverTimestamp(),
  });

  return await getInventoryById(inventoryId);
}

/**
 * Guarda notas o estructura en BORRADOR.
 * No lo manda al historial.
 */
export async function saveInventoryDetailDraft(inventoryId, items, notes = '') {
  const currentInventory = await getInventoryById(inventoryId);

  if (!currentInventory) {
    throw new Error('Inventario no encontrado.');
  }

  const normalizedItems = safeArray(items).map(normalizeInventoryItem);

  await updateInventory(inventoryId, {
    ...currentInventory,
    items: normalizedItems,
    notes: safeString(notes),
    status: 'BORRADOR',
    countingStarted: true,
    countingFinished: false,
    lastCountUpdatedAt: serverTimestamp(),
  });

  return await getInventoryById(inventoryId);
}

/**
 * Guardado FINAL.
 * Aquí recién pasa a historial.
 */
export async function finalizeInventoryCount(
  inventoryId,
  items,
  notes = '',
  actorEmail = ''
) {
  const currentInventory = await getInventoryById(inventoryId);

  if (!currentInventory) {
    throw new Error('Inventario no encontrado.');
  }

  const normalizedItems = safeArray(items).map(normalizeInventoryItem);

  await updateInventory(inventoryId, {
    ...currentInventory,
    items: normalizedItems,
    notes: safeString(notes),
    status: 'GUARDADO',
    countingStarted: true,
    countingFinished: true,
    finalizedAt: serverTimestamp(),
    finalizedByEmail: safeString(actorEmail),
    lastCountUpdatedAt: serverTimestamp(),
  });

  return await getInventoryById(inventoryId);
}

/* =========================
   SUSCRIPCIONES EN TIEMPO REAL
========================= */

export function subscribeAllInventories(callback, options = {}) {
  const includeDrafts = Boolean(options.includeDrafts);
  const q = query(inventoriesRef, orderBy('dateKey', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      let inventories = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      if (!includeDrafts) {
        inventories = inventories.filter((inv) => isFinalStatus(inv.status));
      }

      callback(inventories);
    },
    (error) => {
      console.error('Error en subscribeAllInventories:', error);
      callback([]);
    }
  );
}

export function subscribeInventoryById(inventoryId, callback) {
  const normalizedId = safeString(inventoryId);

  if (!normalizedId) {
    callback(null);
    return () => {};
  }

  const ref = doc(db, 'inventories', normalizedId);

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    (error) => {
      console.error('Error en subscribeInventoryById:', error);
      callback(null);
    }
  );
}

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

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }

      const docSnapshot = snapshot.docs[0];

      callback({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      });
    },
    (error) => {
      console.error('Error en subscribeInventoryByDate:', error);
      callback(null);
    }
  );
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
