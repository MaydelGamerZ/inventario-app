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

const categoriesRef = collection(db, 'categories');
const productsRef = collection(db, 'products');
const inventoriesRef = collection(db, 'inventories');

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
  const payload = {
    name: data.name.trim(),
    description: data.description?.trim() || '',
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(categoriesRef, payload);
  return docRef.id;
}

export async function deleteCategory(categoryId) {
  await deleteDoc(doc(db, 'categories', categoryId));
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
  const payload = {
    name: data.name.trim(),
    categoryId: data.categoryId || '',
    categoryName: data.categoryName || '',
    presentation: data.presentation?.trim() || '',
    weight: data.weight?.trim() || '',
    sku: data.sku?.trim() || '',
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(productsRef, payload);
  return docRef.id;
}

export async function deleteProduct(productId) {
  await deleteDoc(doc(db, 'products', productId));
}

/* =========================
   INVENTARIOS
========================= */

export async function getAllInventories() {
  const q = query(inventoriesRef, orderBy('createdAt', 'desc'));
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
  if (!dateKey || typeof dateKey !== 'string') {
    return null;
  }

  const q = query(
    inventoriesRef,
    where('dateKey', '==', dateKey.trim()),
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
    date: data.date || '',
    dateKey: data.dateKey || '',
    week: data.week || '',
    cedis: data.cedis || '',
    status: data.status || 'Abierto',
    sourceType: data.sourceType || 'manual',
    sourceFileName: data.sourceFileName || '',
    importedByEmail: data.importedByEmail || '',
    importedAt: serverTimestamp(),
    totals: data.totals || {},
    categories: Array.isArray(data.categories) ? data.categories : [],
    items: Array.isArray(data.items) ? data.items : [],
    notes: data.notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(inventoriesRef, payload);
  return docRef.id;
}

export async function updateInventory(inventoryId, data) {
  if (!inventoryId) {
    throw new Error('No se recibió el id del inventario.');
  }

  const ref = doc(db, 'inventories', inventoryId);

  await updateDoc(ref, {
    date: data.date || '',
    dateKey: data.dateKey || '',
    week: data.week || '',
    cedis: data.cedis || '',
    status: data.status || 'Abierto',
    sourceType: data.sourceType || 'manual',
    sourceFileName: data.sourceFileName || '',
    importedByEmail: data.importedByEmail || '',
    importedAt: serverTimestamp(),
    totals: data.totals || {},
    categories: Array.isArray(data.categories) ? data.categories : [],
    items: Array.isArray(data.items) ? data.items : [],
    notes: data.notes || '',
    updatedAt: serverTimestamp(),
  });
}

export async function saveParsedPdfInventory(parsedInventory, userEmail = '') {
  if (!parsedInventory?.dateKey) {
    throw new Error('El inventario procesado no tiene una fecha válida.');
  }

  const existing = await getInventoryByDate(parsedInventory.dateKey);

  const payload = {
    date: parsedInventory.dateLabel || '',
    dateKey: parsedInventory.dateKey,
    week: parsedInventory.week || '',
    cedis: parsedInventory.cedis || '',
    status: 'Abierto',
    sourceType: 'pdf',
    sourceFileName: parsedInventory.sourceFileName || '',
    importedByEmail: userEmail || '',
    totals: {
      totalGeneral: parsedInventory.totalGeneral || 0,
      totalGeneralNoDisponible: parsedInventory.totalGeneralNoDisponible || 0,
      productCount: parsedInventory.items?.length || 0,
      categoryCount: parsedInventory.categories?.length || 0,
    },
    categories: parsedInventory.categories || [],
    items: parsedInventory.items || [],
    notes: '',
  };

  if (existing) {
    await updateInventory(existing.id, payload);
    return await getInventoryById(existing.id);
  }

  const newId = await createInventory(payload);
  return await getInventoryById(newId);
}
