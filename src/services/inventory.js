import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  limit,
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

export async function getInventoryByDate(date) {
  const q = query(inventoriesRef, where('date', '==', date), limit(1));

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
    status: data.status || 'Abierto',
    cedis: data.cedis || '',
    week: data.week || '',
    createdBy: data.createdBy || '',
    userEmail: data.userEmail || '',
    items: Array.isArray(data.items) ? data.items : [],
    notes: data.notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(inventoriesRef, payload);
  return docRef.id;
}

export async function createTodayInventory(data) {
  const existingInventory = await getInventoryByDate(data.date);

  if (existingInventory) {
    return existingInventory;
  }

  const newInventoryId = await createInventory({
    date: data.date,
    status: data.status || 'Abierto',
    cedis: data.cedis || '',
    week: data.week || '',
    createdBy: data.createdBy || '',
    userEmail: data.userEmail || '',
    items: [],
    notes: '',
  });

  const createdInventory = await getInventoryById(newInventoryId);
  return createdInventory;
}

export async function updateInventory(inventoryId, data) {
  const ref = doc(db, 'inventories', inventoryId);

  await updateDoc(ref, {
    date: data.date || '',
    status: data.status || 'Abierto',
    cedis: data.cedis || '',
    week: data.week || '',
    items: Array.isArray(data.items) ? data.items : [],
    notes: data.notes || '',
    updatedAt: serverTimestamp(),
  });
}
