// src/utils/localInventory.js

const STORAGE_KEY = 'inventarios_guardados';

function safeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(
      'Error al leer inventarios guardados en localStorage:',
      error
    );
    return [];
  }
}

function writeStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error al guardar inventarios en localStorage:', error);
    return false;
  }
}

function normalizeHistorialEntry(entry) {
  return {
    id: safeString(entry?.id) || createId('hist'),
    cantidad: Math.max(0, safeNumber(entry?.cantidad, 0)),
    estado: safeString(entry?.estado, 'Buen estado'),
    observacion: safeString(entry?.observacion, ''),
    fecha: safeString(entry?.fecha) || new Date().toISOString(),
  };
}

function normalizeProducto(producto) {
  const historial = safeArray(producto?.historial).map(normalizeHistorialEntry);

  const conteoDesdeHistorial = historial.reduce(
    (acc, item) => acc + safeNumber(item.cantidad, 0),
    0
  );

  const conteoTotalOriginal = safeNumber(producto?.conteoTotal, 0);
  const conteoTotal =
    conteoTotalOriginal > 0 ? conteoTotalOriginal : conteoDesdeHistorial;

  return {
    id: safeString(producto?.id) || createId('prod'),
    nombre: safeString(producto?.nombre, 'Sin nombre'),
    categoria: safeString(producto?.categoria, 'Sin categoría'),
    conteoTotal: Math.max(0, conteoTotal),
    historial,
  };
}

function normalizeInventario(inventario) {
  const productos = safeArray(inventario?.productos).map(normalizeProducto);

  return {
    id: safeString(inventario?.id) || createId('inv'),
    fecha: safeString(inventario?.fecha) || new Date().toISOString(),
    nombre: safeString(inventario?.nombre, 'Inventario diario'),
    sucursal: safeString(inventario?.sucursal, 'Sin sucursal'),
    usuario: safeString(inventario?.usuario, 'Sin usuario'),
    totalProductos: productos.length,
    totalConteos: productos.reduce(
      (acc, prod) => acc + safeNumber(prod.conteoTotal, 0),
      0
    ),
    productos,
  };
}

/**
 * Guarda un inventario en el historial local.
 * Retorna el inventario ya normalizado si se guardó correctamente.
 */
export function guardarInventarioEnHistorial(nuevoInventario) {
  const existentes = readStorage();
  const inventarioNormalizado = normalizeInventario(nuevoInventario);

  existentes.push(inventarioNormalizado);

  const ok = writeStorage(existentes);
  if (!ok) {
    throw new Error(
      'No se pudo guardar el inventario en el almacenamiento local.'
    );
  }

  return inventarioNormalizado;
}

/**
 * Devuelve todos los inventarios guardados, del más reciente al más antiguo.
 */
export function obtenerInventariosGuardados() {
  return readStorage()
    .map(normalizeInventario)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

/**
 * Devuelve un inventario por id.
 */
export function obtenerInventarioPorId(inventarioId) {
  const id = safeString(inventarioId);
  if (!id) return null;

  const inventarios = obtenerInventariosGuardados();
  return inventarios.find((inv) => inv.id === id) || null;
}

/**
 * Elimina un inventario del historial local por id.
 * Retorna true si lo eliminó, false si no lo encontró.
 */
export function eliminarInventarioGuardado(inventarioId) {
  const id = safeString(inventarioId);
  if (!id) return false;

  const existentes = readStorage();
  const filtrados = existentes.filter((inv) => safeString(inv?.id) !== id);

  if (filtrados.length === existentes.length) {
    return false;
  }

  return writeStorage(filtrados);
}

/**
 * Reemplaza todo el historial local.
 * Útil para restauraciones o migraciones.
 */
export function reemplazarInventariosGuardados(inventarios = []) {
  const normalizados = safeArray(inventarios).map(normalizeInventario);
  return writeStorage(normalizados);
}

/**
 * Borra todo el historial local.
 */
export function limpiarInventariosGuardados() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error al limpiar inventarios guardados:', error);
    return false;
  }
}
