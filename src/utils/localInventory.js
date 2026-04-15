// src/utils/localInventory.js
const STORAGE_KEY = 'inventarios_guardados';

/**
 * Guarda un inventario en el historial local.
 * Acepta un objeto con la estructura:
 * {
 *   nombre: string,
 *   sucursal: string,
 *   usuario: string,
 *   productos: [
 *     {
 *       id: string,
 *       nombre: string,
 *       categoria: string,
 *       conteoTotal: number,
 *       historial: [
 *         {
 *           id: string,
 *           cantidad: number,
 *           estado: string,
 *           observacion: string,
 *           fecha: string (ISO)
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
export function guardarInventarioEnHistorial(nuevoInventario) {
  const existentes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

  existentes.push({
    id: `inv_${Date.now()}`,
    fecha: new Date().toISOString(),
    nombre: nuevoInventario.nombre || 'Inventario diario',
    sucursal: nuevoInventario.sucursal || 'Sin sucursal',
    usuario: nuevoInventario.usuario || 'Sin usuario',
    totalProductos: Array.isArray(nuevoInventario.productos)
      ? nuevoInventario.productos.length
      : 0,
    totalConteos: Array.isArray(nuevoInventario.productos)
      ? nuevoInventario.productos.reduce(
          (acc, prod) => acc + Number(prod.conteoTotal || 0),
          0
        )
      : 0,
    productos: Array.isArray(nuevoInventario.productos)
      ? nuevoInventario.productos
      : [],
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(existentes));
}
