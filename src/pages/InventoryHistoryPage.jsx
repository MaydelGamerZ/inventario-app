import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  Package,
  Search,
  Trash2,
  X,
  ArchiveRestore,
} from 'lucide-react';

const STORAGE_KEY = 'inventarios_guardados';

function formatDate(dateString) {
  if (!dateString) return 'Sin fecha';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeInventory(inv, index = 0) {
  const productos = safeArray(inv?.productos).map((producto, productIndex) => {
    const historial = safeArray(producto?.historial).map((item, itemIndex) => ({
      id:
        item?.id ||
        `hist_${index}_${productIndex}_${itemIndex}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      cantidad: Number(item?.cantidad || 0),
      estado: item?.estado || 'BUEN ESTADO',
      observacion: item?.observacion || '',
      fecha: item?.fecha || inv?.fecha || new Date().toISOString(),
    }));

    const conteoTotal =
      producto?.conteoTotal != null
        ? Number(producto.conteoTotal || 0)
        : historial.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);

    return {
      id:
        producto?.id ||
        `prod_${index}_${productIndex}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      nombre: producto?.nombre || 'Producto sin nombre',
      categoria: producto?.categoria || 'Sin categoría',
      conteoTotal,
      historial,
    };
  });

  const totalProductos =
    inv?.totalProductos != null
      ? Number(inv.totalProductos || 0)
      : productos.length;

  const totalConteos =
    inv?.totalConteos != null
      ? Number(inv.totalConteos || 0)
      : productos.reduce((acc, prod) => acc + Number(prod.conteoTotal || 0), 0);

  return {
    id: inv?.id || `inv_${index}_${Date.now()}`,
    fecha: inv?.fecha || new Date().toISOString(),
    nombre: inv?.nombre || `Inventario ${index + 1}`,
    sucursal: inv?.sucursal || 'Sin sucursal',
    usuario: inv?.usuario || 'Sin usuario',
    totalProductos,
    totalConteos,
    productos,
  };
}

function getSavedInventories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((inv, index) => normalizeInventory(inv, index));
  } catch (error) {
    console.error('Error al leer inventarios:', error);
    return [];
  }
}

function saveInventories(inventories) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventories));
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function buildInventoryJson(inventory) {
  return JSON.stringify(inventory, null, 2);
}

function escapeCsv(value) {
  const stringValue = String(value ?? '');

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function buildInventoryCsv(inventory) {
  const headers = [
    'Inventario',
    'Fecha inventario',
    'Sucursal',
    'Usuario',
    'Producto',
    'Categoría',
    'Conteo total producto',
    'Cantidad movimiento',
    'Estado',
    'Observación',
    'Fecha movimiento',
  ];

  const rows = [];

  inventory.productos.forEach((producto) => {
    if (!producto.historial.length) {
      rows.push([
        inventory.nombre,
        formatDate(inventory.fecha),
        inventory.sucursal,
        inventory.usuario,
        producto.nombre,
        producto.categoria,
        producto.conteoTotal,
        '',
        '',
        '',
        '',
      ]);
      return;
    }

    producto.historial.forEach((movimiento) => {
      rows.push([
        inventory.nombre,
        formatDate(inventory.fecha),
        inventory.sucursal,
        inventory.usuario,
        producto.nombre,
        producto.categoria,
        producto.conteoTotal,
        movimiento.cantidad,
        movimiento.estado,
        movimiento.observacion,
        formatDate(movimiento.fecha),
      ]);
    });
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');

  return '\uFEFF' + csv;
}

function InventoryDetailModal({ inventory, onClose }) {
  if (!inventory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 md:items-center md:justify-center">
      <div className="h-[90vh] w-full overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-950 md:h-auto md:max-h-[90vh] md:w-[1100px] md:rounded-3xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 md:px-6">
          <div>
            <h2 className="text-xl font-semibold text-white md:text-2xl">
              {inventory.nombre}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {formatDate(inventory.fecha)} · {inventory.sucursal} ·{' '}
              {inventory.usuario}
            </p>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 border-b border-zinc-800 px-4 py-4 md:grid-cols-3 md:px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Productos</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {inventory.totalProductos}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Conteo total</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {inventory.totalConteos}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Movimientos registrados</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {inventory.productos.reduce(
                (acc, producto) => acc + producto.historial.length,
                0
              )}
            </p>
          </div>
        </div>

        <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-4 py-4 md:px-6">
          <div className="space-y-4">
            {inventory.productos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">
                Este inventario no tiene productos guardados.
              </div>
            ) : (
              inventory.productos.map((producto) => (
                <div
                  key={producto.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70"
                >
                  <div className="flex flex-col gap-2 border-b border-zinc-800 px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white md:text-lg">
                        {producto.nombre}
                      </h3>
                      <p className="text-sm text-zinc-400">
                        {producto.categoria}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-500/15 px-3 py-2 text-sm font-medium text-blue-300">
                      Conteo total: {producto.conteoTotal}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-zinc-950 text-zinc-400">
                        <tr>
                          <th className="px-4 py-3 font-medium">Cantidad</th>
                          <th className="px-4 py-3 font-medium">Estado</th>
                          <th className="px-4 py-3 font-medium">Observación</th>
                          <th className="px-4 py-3 font-medium">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {producto.historial.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-4 text-center text-zinc-500"
                            >
                              Sin historial registrado
                            </td>
                          </tr>
                        ) : (
                          producto.historial.map((movimiento) => (
                            <tr
                              key={movimiento.id}
                              className="border-t border-zinc-800 text-zinc-200"
                            >
                              <td className="px-4 py-3">
                                {movimiento.cantidad}
                              </td>
                              <td className="px-4 py-3">{movimiento.estado}</td>
                              <td className="px-4 py-3">
                                {movimiento.observacion || '—'}
                              </td>
                              <td className="px-4 py-3">
                                {formatDate(movimiento.fecha)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InventoryHistoryPage() {
  const [inventories, setInventories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedInventory, setSelectedInventory] = useState(null);

  useEffect(() => {
    setInventories(getSavedInventories());
  }, []);

  const filteredInventories = useMemo(() => {
    const query = search.trim().toLowerCase();

    const sorted = [...inventories].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    if (!query) return sorted;

    return sorted.filter((inventory) => {
      const text = [
        inventory.nombre,
        inventory.sucursal,
        inventory.usuario,
        formatDate(inventory.fecha),
        ...inventory.productos.map((p) => p.nombre),
        ...inventory.productos.map((p) => p.categoria),
      ]
        .join(' ')
        .toLowerCase();

      return text.includes(query);
    });
  }, [inventories, search]);

  const handleRefresh = () => {
    setInventories(getSavedInventories());
  };

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      '¿Seguro que quieres eliminar este inventario? Esta acción no se puede deshacer.'
    );

    if (!confirmed) return;

    const updated = inventories.filter((item) => item.id !== id);
    setInventories(updated);
    saveInventories(updated);

    if (selectedInventory?.id === id) {
      setSelectedInventory(null);
    }
  };

  const handleDownloadJson = (inventory) => {
    const content = buildInventoryJson(inventory);
    const safeName = inventory.nombre
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_');

    downloadFile(
      `${safeName || 'inventario'}_${new Date(inventory.fecha)
        .toISOString()
        .slice(0, 10)}.json`,
      content,
      'application/json;charset=utf-8;'
    );
  };

  const handleDownloadCsv = (inventory) => {
    const content = buildInventoryCsv(inventory);
    const safeName = inventory.nombre
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_');

    downloadFile(
      `${safeName || 'inventario'}_${new Date(inventory.fecha)
        .toISOString()
        .slice(0, 10)}.csv`,
      content,
      'text/csv;charset=utf-8;'
    );
  };

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-3xl font-bold text-white">
            Historial de Inventarios
          </h1>
          <p className="mt-2 text-zinc-400">
            Aquí verás los inventarios guardados por fecha.
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                placeholder="Buscar por fecha, nombre, sucursal, usuario o producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500/50"
              />
            </div>

            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              <ArchiveRestore size={18} />
              Recargar
            </button>
          </div>
        </section>

        {filteredInventories.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
              <Package className="text-zinc-400" size={26} />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-white">
              No hay inventarios guardados
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-400 md:text-base">
              Aquí aparecerán los inventarios cuando los guardes desde
              Inventario Diario.
            </p>
          </section>
        ) : (
          <section className="grid gap-4">
            {filteredInventories.map((inventory) => (
              <article
                key={inventory.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700 md:p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white md:text-xl">
                        {inventory.nombre}
                      </h2>

                      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                        {inventory.sucursal}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-400 md:flex-row md:flex-wrap md:items-center md:gap-4">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={16} />
                        {formatDate(inventory.fecha)}
                      </span>

                      <span className="inline-flex items-center gap-2">
                        <Package size={16} />
                        {inventory.totalProductos} productos
                      </span>

                      <span>{inventory.totalConteos} piezas contadas</span>
                      <span>Usuario: {inventory.usuario}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                    <button
                      onClick={() => setSelectedInventory(inventory)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                      <Eye size={17} />
                      Ver
                    </button>

                    <button
                      onClick={() => handleDownloadJson(inventory)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                      <FileJson size={17} />
                      JSON
                    </button>

                    <button
                      onClick={() => handleDownloadCsv(inventory)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                      <FileSpreadsheet size={17} />
                      CSV
                    </button>

                    <button
                      onClick={() => handleDelete(inventory.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={17} />
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      <InventoryDetailModal
        inventory={selectedInventory}
        onClose={() => setSelectedInventory(null)}
      />
    </>
  );
}
