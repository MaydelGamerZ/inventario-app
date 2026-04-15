import { db } from '../firebase';
import {
  ref,
  push,
  get,
  query,
  orderByChild,
  equalTo,
  update,
} from 'firebase/database';

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function getInventoryByDate(date) {
  const inventariosRef = ref(db, 'inventarios');
  const inventariosQuery = query(
    inventariosRef,
    orderByChild('fecha'),
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

export async function createTodayInventory(user) {
  const today = getTodayDateString();

  const existingInventory = await getInventoryByDate(today);

  if (existingInventory) {
    throw new Error('Ya existe un inventario para hoy.');
  }

  const inventariosRef = ref(db, 'inventarios');

  const newInventory = {
    fecha: today,
    semana: '',
    cedis: '',
    estado: 'abierto',
    origen: 'manual',
    totalCategorias: 0,
    totalProductos: 0,
    creadoEn: new Date().toISOString(),
    creadoPor: {
      uid: user?.uid || '',
      nombre: user?.displayName || '',
      email: user?.email || '',
    },
    actualizadoEn: new Date().toISOString(),
  };

  const newRef = await push(inventariosRef, newInventory);

  return {
    id: newRef.key,
    ...newInventory,
  };
}

export async function getAllInventories() {
  const inventariosRef = ref(db, 'inventarios');
  const snapshot = await get(inventariosRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();

  const inventories = Object.entries(data).map(([id, value]) => ({
    id,
    ...value,
  }));

  inventories.sort((a, b) => {
    return new Date(b.fecha) - new Date(a.fecha);
  });

  return inventories;
}

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

export async function updateInventoryBasicData(inventoryId, payload) {
  const inventoryRef = ref(db, `inventarios/${inventoryId}`);

  await update(inventoryRef, {
    ...payload,
    actualizadoEn: new Date().toISOString(),
  });
}
