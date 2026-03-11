import { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase/config';
import { ref, push, onValue, update } from 'firebase/database';

export default function Productos() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [vista, setVista] = useState('activos'); // activos | inactivos

  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    categoriaId: '',
  });

  const [editandoProducto, setEditandoProducto] = useState(null);

  // ================= CARGAR CATEGORÍAS =================
  useEffect(() => {
    const categoriasRef = ref(db, 'categorias');
    onValue(categoriasRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return setCategorias([]);

      const lista = Object.entries(data).map(([id, value]) => ({
        id,
        ...value,
      }));

      setCategorias(lista.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    });
  }, []);

  // ================= CARGAR PRODUCTOS =================
  useEffect(() => {
    const productosRef = ref(db, 'productos');
    onValue(productosRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return setProductos([]);

      const lista = Object.entries(data).map(([id, value]) => ({
        id,
        ...value,
      }));

      setProductos(lista.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });
  }, []);

  // ================= FILTRAR PRODUCTOS =================
  const productosFiltrados = productos.filter((p) =>
    vista === 'activos' ? p.activo !== false : p.activo === false
  );

  const productosPorCategoria = useMemo(() => {
    return categorias.map((cat) => ({
      ...cat,
      productos: productosFiltrados.filter((p) => p.categoriaId === cat.id),
    }));
  }, [categorias, productosFiltrados]);

  // ================= CREAR CATEGORÍA =================
  const crearCategoria = () => {
    if (!nuevaCategoria.trim()) return;

    push(ref(db, 'categorias'), {
      nombre: nuevaCategoria.trim(),
      orden: categorias.length + 1,
      fechaCreacion: Date.now(),
    });

    setNuevaCategoria('');
  };

  // ================= GUARDAR PRODUCTO =================
  const guardarProducto = () => {
    if (!nuevoProducto.nombre.trim() || !nuevoProducto.categoriaId) return;

    if (editandoProducto) {
      update(ref(db, `productos/${editandoProducto}`), {
        nombre: nuevoProducto.nombre.trim(),
        categoriaId: nuevoProducto.categoriaId,
      });
      setEditandoProducto(null);
    } else {
      push(ref(db, 'productos'), {
        codigoInterno: `PROD-${Date.now()}`,
        nombre: nuevoProducto.nombre.trim(),
        categoriaId: nuevoProducto.categoriaId,
        activo: true,
        fechaCreacion: Date.now(),
      });
    }

    setNuevoProducto({ nombre: '', categoriaId: '' });
  };

  const toggleProducto = (id, estadoActual) => {
    update(ref(db, `productos/${id}`), {
      activo: !estadoActual,
    });
  };

  const cancelarEdicion = () => {
    setEditandoProducto(null);
    setNuevoProducto({ nombre: '', categoriaId: '' });
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto space-y-6 md:space-y-8">
      {/* ================= HEADER ================= */}
      <div className="space-y-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Productos</h1>
        <p className="text-sm text-zinc-400">
          Administra categorías y productos del sistema.
        </p>
      </div>

      {/* ================= MENU ================= */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setVista('activos')}
          className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
            vista === 'activos'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          Activos
        </button>

        <button
          onClick={() => setVista('inactivos')}
          className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
            vista === 'inactivos'
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          Inactivos
        </button>
      </div>

      {/* ================= NUEVO PRODUCTO ================= */}
      {vista === 'activos' && (
        <div className="bg-zinc-900 p-4 md:p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">
              {editandoProducto ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <p className="text-sm text-zinc-400">
              Agrega un producto nuevo o actualiza uno existente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Nombre del producto"
              value={nuevoProducto.nombre}
              onChange={(e) =>
                setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })
              }
              className="w-full bg-zinc-800 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
            />

            <select
              value={nuevoProducto.categoriaId}
              onChange={(e) =>
                setNuevoProducto({
                  ...nuevoProducto,
                  categoriaId: e.target.value,
                })
              }
              className="w-full bg-zinc-800 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
              <button
                onClick={guardarProducto}
                className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition"
              >
                {editandoProducto ? 'Actualizar' : 'Guardar'}
              </button>

              {editandoProducto && (
                <button
                  onClick={cancelarEdicion}
                  className="w-full bg-zinc-700 hover:bg-zinc-600 px-6 py-3 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= NUEVA CATEGORÍA ================= */}
      {vista === 'activos' && (
        <div className="bg-zinc-900 p-4 md:p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Nueva Categoría</h2>
            <p className="text-sm text-zinc-400">
              Crea categorías para organizar tus productos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <input
              type="text"
              placeholder="Nombre categoría"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              className="w-full bg-zinc-800 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
            />

            <button
              onClick={crearCategoria}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition"
            >
              Crear
            </button>
          </div>
        </div>
      )}

      {/* ================= LISTADO ================= */}
      <div className="space-y-4">
        {productosPorCategoria.map((cat) => (
          <div
            key={cat.id}
            className="bg-zinc-900 p-4 md:p-6 rounded-2xl border border-zinc-800"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h3 className="font-semibold text-base sm:text-lg">
                {cat.nombre}
              </h3>
              <span className="text-xs sm:text-sm text-zinc-400">
                {cat.productos.length}{' '}
                {cat.productos.length === 1 ? 'producto' : 'productos'}
              </span>
            </div>

            {cat.productos.length === 0 ? (
              <div className="text-zinc-500 text-sm bg-zinc-800/70 rounded-xl p-4 border border-zinc-800">
                Sin productos en esta categoría.
              </div>
            ) : (
              <div className="space-y-3">
                {cat.productos.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700"
                  >
                    <div className="flex flex-col gap-4">
                      {/* INFO */}
                      <div className="min-w-0">
                        <div className="font-medium text-base break-words">
                          {prod.nombre}
                        </div>

                        <div className="text-xs text-zinc-400 mt-1 break-all">
                          {prod.codigoInterno}
                        </div>

                        <div className="mt-3">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              prod.activo !== false
                                ? 'bg-green-600/15 text-green-400'
                                : 'bg-red-600/15 text-red-400'
                            }`}
                          >
                            {prod.activo !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>

                      {/* ACCIONES */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setEditandoProducto(prod.id);
                            setNuevoProducto({
                              nombre: prod.nombre,
                              categoriaId: prod.categoriaId,
                            });
                            window.scrollTo({
                              top: 0,
                              behavior: 'smooth',
                            });
                          }}
                          className="w-full bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 px-4 py-3 rounded-xl text-sm font-medium transition"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() =>
                            toggleProducto(prod.id, prod.activo !== false)
                          }
                          className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition ${
                            prod.activo !== false
                              ? 'bg-red-600/15 hover:bg-red-600/25 text-red-400'
                              : 'bg-green-600/15 hover:bg-green-600/25 text-green-400'
                          }`}
                        >
                          {prod.activo !== false ? 'Deshabilitar' : 'Habilitar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
