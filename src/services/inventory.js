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

export async function saveInventoryDetail(inventoryId, items, notes = '') {
  const currentInventory = await getInventoryById(inventoryId);

  if (!currentInventory) {
    throw new Error('Inventario no encontrado.');
  }

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
