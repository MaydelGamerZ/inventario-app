import { db } from '../firebase.js';
import {
  ref,
  push,
  get,
  query,
  orderByChild,
  equalTo,
  update,
  remove,
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

  inventories.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

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

export async function getCategoriesByInventoryId(inventoryId) {
  const categoriesRef = ref(db, `inventarios/${inventoryId}/categorias`);
  const snapshot = await get(categoriesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();

  const categories = Object.entries(data).map(([id, value]) => ({
    id,
    ...value,
  }));

  categories.sort((a, b) => (a.orden || 0) - (b.orden || 0));

  return categories;
}

export async function getProductsByCategory(inventoryId, categoryId) {
  const productsRef = ref(
    db,
    `inventarios/${inventoryId}/categorias/${categoryId}/productos`
  );

  const snapshot = await get(productsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();

  const products = Object.entries(data).map(([id, value]) => ({
    id,
    ...value,
  }));

  products.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return products;
}

export async function recalculateInventoryTotals(inventoryId) {
  const categories = await getCategoriesByInventoryId(inventoryId);

  let totalCategorias = categories.length;
  let totalProductos = 0;

  for (const category of categories) {
    const products = await getProductsByCategory(inventoryId, category.id);
    totalProductos += products.length;
  }

  const inventoryRef = ref(db, `inventarios/${inventoryId}`);

  await update(inventoryRef, {
    totalCategorias,
    totalProductos,
    actualizadoEn: new Date().toISOString(),
  });
}

export async function importParsedPdfToInventory(inventoryId, parsedPdf) {
  const inventory = await getInventoryById(inventoryId);

  if (!inventory) {
    throw new Error('El inventario no existe.');
  }

  if (inventory.estado !== 'abierto') {
    throw new Error('Solo puedes importar PDF en inventarios abiertos.');
  }

  const categoriasRef = ref(db, `inventarios/${inventoryId}/categorias`);
  await remove(categoriasRef);

  const categoriesParentRef = ref(db, `inventarios/${inventoryId}/categorias`);

  for (let index = 0; index < parsedPdf.categorias.length; index += 1) {
    const categoria = parsedPdf.categorias[index];

    const categoryRef = await push(categoriesParentRef, {
      nombre: categoria.nombre,
      orden: index + 1,
      creadaEn: new Date().toISOString(),
    });

    const productsParentRef = ref(
      db,
      `inventarios/${inventoryId}/categorias/${categoryRef.key}/productos`
    );

    for (const producto of categoria.productos) {
      await push(productsParentRef, {
        nombre: producto.nombre,
        stockEsperado: producto.stockEsperado,
        noDisponible: producto.noDisponible,
        totalContado: 0,
        diferencia: 0,
        estadoConteo: 'pendiente',
        creadoEn: new Date().toISOString(),
      });
    }
  }

  await update(ref(db, `inventarios/${inventoryId}`), {
    semana: parsedPdf.semana || inventory.semana || '',
    cedis: parsedPdf.cedis || inventory.cedis || '',
    origen: 'pdf',
    actualizadoEn: new Date().toISOString(),
  });

  await recalculateInventoryTotals(inventoryId);
}
