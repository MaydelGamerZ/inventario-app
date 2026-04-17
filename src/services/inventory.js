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
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Colección principal de inventarios
 */
const INVENTORIES_COLLECTION = 'inventories';

/**
 * Convierte cualquier valor tipo fecha Firestore a milisegundos.
 */
function toMillis(value) {
  if (!value) return 0;

  if (typeof value?.toMillis === 'function') {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  return 0;
}

/**
 * Limpia texto.
 */
function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convierte a número seguro.
 */
function safeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const parsed = Number(
    String(value ?? '')
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '')
      .trim()
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Normaliza un item del inventario.
 */
function normalizeInventoryItem(item = {}, index = 0) {
  return {
    itemKey:
      cleanText(item.itemKey) ||
      `item-${index}-${cleanText(item.productName || 'producto')}`,
    productName: cleanText(item.productName) || `Producto ${index + 1}`,
    expectedQuantity: safeNumber(item.expectedQuantity),
    unavailableQuantity: safeNumber(item.unavailableQuantity),
    countedQuantity: safeNumber(item.countedQuantity),
    supplierCode: cleanText(item.supplierCode),
    supplierName: cleanText(item.supplierName),
    categoryCode: cleanText(item.categoryCode),
    categoryName: cleanText(item.categoryName),
    categoryRaw: cleanText(item.categoryRaw),
    status: cleanText(item.status || 'OK').toUpperCase(),
    countEntries: Array.isArray(item.countEntries) ? item.countEntries : [],
  };
}

/**
 * Recalcula conteo y estado por item.
 */
function recalculateItem(item = {}) {
  const countEntries = Array.isArray(item.countEntries)
    ? item.countEntries
    : [];

  const countedQuantity = countEntries.reduce(
    (sum, entry) => sum + safeNumber(entry?.quantity),
    0
  );

  const expectedQuantity = safeNumber(item.expectedQuantity);
  const unavailableQuantity = safeNumber(item.unavailableQuantity);

  let status = 'OK';

  if (countedQuantity <= 0 && expectedQuantity > 0) {
    status = 'FALTANTE';
  } else if (countedQuantity < expectedQuantity) {
    status = 'ALERTA';
  }

  const hasDamagedOrExpired = countEntries.some((entry) => {
    const obs = cleanText(entry?.observationType).toLowerCase();
    return (
      obs === 'caducado' ||
      obs === 'dañado' ||
      obs === 'danado' ||
      obs === 'mojado' ||
      obs === 'maltratado'
    );
  });

  if (hasDamagedOrExpired) {
    const obsList = countEntries.map((entry) =>
      cleanText(entry?.observationType).toLowerCase()
    );

    if (obsList.includes('caducado')) {
      status = 'CADUCADO';
    } else {
      status = 'DAÑADO';
    }
  }

  return {
    ...item,
    unavailableQuantity,
    countedQuantity,
    status,
    countEntries,
  };
}

/**
 * Normaliza categorías desde el parser.
 */
function normalizeCategories(categories = []) {
  if (!Array.isArray(categories)) return [];

  return categories.map((category, index) => ({
    id:
      cleanText(category.id) ||
      `${cleanText(category.supplierCode)}-${cleanText(
        category.categoryCode
      )}-${index}`,
    supplierCode: cleanText(category.supplierCode),
    supplierName: cleanText(category.supplierName),
    categoryCode: cleanText(category.categoryCode),
    categoryName: cleanText(category.categoryName),
    categoryRaw: cleanText(category.categoryRaw),
    fullName:
      cleanText(category.fullName) ||
      cleanText(category.categoryRaw) ||
      cleanText(category.categoryName) ||
      `Categoría ${index + 1}`,
    totalUnits: safeNumber(category.totalUnits),
    totalUnavailable: safeNumber(category.totalUnavailable),
    itemCount: safeNumber(category.itemCount),
  }));
}

/**
 * Recalcula resumen general del inventario.
 */
function buildInventoryTotals(items = []) {
  const totalExpected = items.reduce(
    (sum, item) => sum + safeNumber(item.expectedQuantity),
    0
  );

  const totalUnavailable = items.reduce(
    (sum, item) => sum + safeNumber(item.unavailableQuantity),
    0
  );

  const totalCounted = items.reduce(
    (sum, item) => sum + safeNumber(item.countedQuantity),
    0
  );

  return {
    totalExpected,
    totalUnavailable,
    totalCounted,
    totalProducts: items.length,
  };
}

/**
 * Normaliza documento Firestore.
 */
function normalizeInventoryDoc(snapshotOrObject) {
  const raw =
    typeof snapshotOrObject?.data === 'function'
      ? snapshotOrObject.data()
      : snapshotOrObject || {};

  const id = snapshotOrObject?.id || raw.id || cleanText(raw.dateKey) || '';

  const items = Array.isArray(raw.items)
    ? raw.items.map((item, index) =>
        recalculateItem(normalizeInventoryItem(item, index))
      )
    : [];

  const totals = buildInventoryTotals(items);

  return {
    id,
    dateKey: cleanText(raw.dateKey),
    dateLabel: cleanText(raw.dateLabel),
    date: cleanText(raw.date),
    week: cleanText(raw.week),
    cedis: cleanText(raw.cedis),
    sourceFileName: cleanText(raw.sourceFileName),
    status: cleanText(raw.status || 'BORRADOR').toUpperCase(),
    countingStarted: Boolean(raw.countingStarted),
    createdByEmail: cleanText(raw.createdByEmail),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    finalizedAt: raw.finalizedAt || null,
    finalizedByEmail: cleanText(raw.finalizedByEmail),
    savedByEmail: cleanText(raw.savedByEmail),
    categories: normalizeCategories(raw.categories),
    items,
    totals: raw.totals || {},
    totalGeneral: safeNumber(raw.totalGeneral) || totals.totalExpected,
    totalGeneralNoDisponible:
      safeNumber(raw.totalGeneralNoDisponible) || totals.totalUnavailable,
    ...totals,
  };
}

/**
 * Guarda o reemplaza el inventario diario usando dateKey como id del documento.
 * Esto evita duplicados por día.
 */
export async function saveDailyInventoryFromPdf(parsed, userEmail = '') {
  const dateKey = cleanText(parsed?.dateKey);

  if (!dateKey) {
    throw new Error(
      'El PDF no contiene una fecha válida para guardar el inventario.'
    );
  }

  const items = Array.isArray(parsed?.items)
    ? parsed.items.map((item, index) =>
        recalculateItem(normalizeInventoryItem(item, index))
      )
    : [];

  const categories = normalizeCategories(parsed?.categories || []);
  const totals = buildInventoryTotals(items);

  const docRef = doc(db, INVENTORIES_COLLECTION, dateKey);
  const existingSnap = await getDoc(docRef);
  const nowTimestamp = serverTimestamp();

  const payload = {
    id: dateKey,
    dateKey,
    dateLabel: cleanText(parsed?.dateLabel),
    date: cleanText(parsed?.dateLabel),
    week: cleanText(parsed?.week),
    cedis: cleanText(parsed?.cedis),
    sourceFileName: cleanText(parsed?.sourceFileName),
    categories,
    items,
    totals: parsed?.totals || {},
    totalGeneral: safeNumber(parsed?.totalGeneral) || totals.totalExpected,
    totalGeneralNoDisponible:
      safeNumber(parsed?.totalGeneralNoDisponible) || totals.totalUnavailable,
    countingStarted: existingSnap.exists()
      ? Boolean(existingSnap.data()?.countingStarted)
      : false,
    status: existingSnap.exists()
      ? cleanText(existingSnap.data()?.status || 'BORRADOR').toUpperCase()
      : 'BORRADOR',
    savedByEmail: cleanText(existingSnap.data()?.savedByEmail),
    finalizedByEmail: cleanText(existingSnap.data()?.finalizedByEmail),
    finalizedAt: existingSnap.data()?.finalizedAt || null,
    createdByEmail: existingSnap.exists()
      ? cleanText(existingSnap.data()?.createdByEmail)
      : cleanText(userEmail),
    createdAt: existingSnap.exists()
      ? existingSnap.data()?.createdAt || nowTimestamp
      : nowTimestamp,
    updatedAt: nowTimestamp,
  };

  await setDoc(docRef, payload, { merge: true });

  return {
    id: dateKey,
    ...payload,
  };
}

/**
 * Suscripción al inventario por fecha.
 * Usa una query simple por dateKey y limit(1).
 * Esta normalmente NO requiere el índice compuesto del error que mostraste.
 */
export function subscribeInventoryByDate(dateKey, callback) {
  const cleanDateKey = cleanText(dateKey);

  if (!cleanDateKey) {
    callback?.(null);
    return () => {};
  }

  const q = query(
    collection(db, INVENTORIES_COLLECTION),
    where('dateKey', '==', cleanDateKey),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback?.(null);
        return;
      }

      const docSnap = snapshot.docs[0];
      callback?.(normalizeInventoryDoc(docSnap));
    },
    (error) => {
      console.error('Error en subscribeInventoryByDate:', error);
      callback?.(null);
    }
  );
}

/**
 * Suscripción a todos los inventarios.
 *
 * CLAVE:
 * Aquí evitamos combinar where + orderBy que te estaba pidiendo índice.
 * Traemos por updatedAt desc y luego filtramos en JS cuando haga falta en la página.
 */
export function subscribeAllInventories(callback) {
  const q = query(
    collection(db, INVENTORIES_COLLECTION),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) =>
        normalizeInventoryDoc(docSnap)
      );

      callback?.(list);
    },
    (error) => {
      console.error('Error en subscribeAllInventories:', error);
      callback?.([]);
    }
  );
}

/**
 * Obtiene inventario por id.
 */
export async function getInventoryById(inventoryId) {
  const cleanId = cleanText(inventoryId);

  if (!cleanId) {
    throw new Error('ID de inventario inválido.');
  }

  const snap = await getDoc(doc(db, INVENTORIES_COLLECTION, cleanId));

  if (!snap.exists()) {
    throw new Error('No se encontró el inventario.');
  }

  return normalizeInventoryDoc(snap);
}

/**
 * Suscripción a inventario por id.
 */
export function subscribeInventoryById(inventoryId, callback) {
  const cleanId = cleanText(inventoryId);

  if (!cleanId) {
    callback?.(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, INVENTORIES_COLLECTION, cleanId),
    (snap) => {
      if (!snap.exists()) {
        callback?.(null);
        return;
      }

      callback?.(normalizeInventoryDoc(snap));
    },
    (error) => {
      console.error('Error en subscribeInventoryById:', error);
      callback?.(null);
    }
  );
}

/**
 * Marca inicio de conteo.
 */
export async function startInventoryCount(inventoryId) {
  const cleanId = cleanText(inventoryId);

  if (!cleanId) {
    throw new Error('No se pudo iniciar el conteo: ID inválido.');
  }

  const ref = doc(db, INVENTORIES_COLLECTION, cleanId);

  await updateDoc(ref, {
    countingStarted: true,
    status: 'BORRADOR',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Agrega una entrada de conteo a un producto específico.
 */
export async function addInventoryCountEntry(
  inventoryId,
  itemKey,
  entry,
  userEmail = ''
) {
  const cleanId = cleanText(inventoryId);
  const cleanItemKey = cleanText(itemKey);

  if (!cleanId || !cleanItemKey) {
    throw new Error('Datos inválidos para registrar el conteo.');
  }

  const ref = doc(db, INVENTORIES_COLLECTION, cleanId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('No se encontró el inventario.');
  }

  const inventory = normalizeInventoryDoc(snap);

  const items = inventory.items.map((item) => {
    if (cleanText(item.itemKey) !== cleanItemKey) return item;

    const nextEntry = {
      quantity: safeNumber(entry?.quantity),
      observationType: cleanText(entry?.observationType || 'Buen estado'),
      comment: cleanText(entry?.comment),
      createdByEmail: cleanText(userEmail || entry?.createdByEmail),
      createdBy: cleanText(entry?.createdBy),
      createdAt: new Date().toISOString(),
      createdAtLabel: cleanText(entry?.createdAtLabel),
    };

    const nextItem = {
      ...item,
      countEntries: [
        ...(Array.isArray(item.countEntries) ? item.countEntries : []),
        nextEntry,
      ],
    };

    return recalculateItem(nextItem);
  });

  const totals = buildInventoryTotals(items);

  await updateDoc(ref, {
    items,
    totalGeneral: totals.totalExpected,
    totalGeneralNoDisponible: totals.totalUnavailable,
    updatedAt: serverTimestamp(),
    countingStarted: true,
    status: 'BORRADOR',
  });
}

/**
 * Elimina una entrada de conteo por índice.
 */
export async function removeInventoryCountEntry(
  inventoryId,
  itemKey,
  entryIndex
) {
  const cleanId = cleanText(inventoryId);
  const cleanItemKey = cleanText(itemKey);

  if (!cleanId || !cleanItemKey) {
    throw new Error('Datos inválidos para eliminar el conteo.');
  }

  const ref = doc(db, INVENTORIES_COLLECTION, cleanId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('No se encontró el inventario.');
  }

  const inventory = normalizeInventoryDoc(snap);

  const items = inventory.items.map((item) => {
    if (cleanText(item.itemKey) !== cleanItemKey) return item;

    const currentEntries = Array.isArray(item.countEntries)
      ? item.countEntries
      : [];
    const nextEntries = currentEntries.filter(
      (_, index) => index !== entryIndex
    );

    return recalculateItem({
      ...item,
      countEntries: nextEntries,
    });
  });

  const totals = buildInventoryTotals(items);

  await updateDoc(ref, {
    items,
    totalGeneral: totals.totalExpected,
    totalGeneralNoDisponible: totals.totalUnavailable,
    updatedAt: serverTimestamp(),
    status: 'BORRADOR',
  });
}

/**
 * Guarda el inventario como final.
 */
export async function finalizeInventory(inventoryId, userEmail = '') {
  const cleanId = cleanText(inventoryId);

  if (!cleanId) {
    throw new Error('ID de inventario inválido.');
  }

  const ref = doc(db, INVENTORIES_COLLECTION, cleanId);

  await updateDoc(ref, {
    status: 'GUARDADO',
    finalizedByEmail: cleanText(userEmail),
    savedByEmail: cleanText(userEmail),
    finalizedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Vuelve a poner en borrador.
 */
export async function reopenInventoryDraft(inventoryId) {
  const cleanId = cleanText(inventoryId);

  if (!cleanId) {
    throw new Error('ID de inventario inválido.');
  }

  await updateDoc(doc(db, INVENTORIES_COLLECTION, cleanId), {
    status: 'BORRADOR',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Elimina inventario.
 */
export async function deleteInventory(inventoryId) {
  const cleanId = cleanText(inventoryId);

  if (!cleanId) {
    throw new Error('ID de inventario inválido.');
  }

  await deleteDoc(doc(db, INVENTORIES_COLLECTION, cleanId));
}
