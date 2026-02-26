import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase/config";
import { ref, push, onValue, update } from "firebase/database";

export default function Productos() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [vista, setVista] = useState("activos"); // activos | inactivos

  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    categoriaId: ""
  });

  const [editandoProducto, setEditandoProducto] = useState(null);

  // ================= CARGAR CATEGORÍAS =================
  useEffect(() => {
    const categoriasRef = ref(db, "categorias");
    onValue(categoriasRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return setCategorias([]);

      const lista = Object.entries(data).map(([id, value]) => ({
        id,
        ...value
      }));

      setCategorias(lista.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    });
  }, []);

  // ================= CARGAR PRODUCTOS =================
  useEffect(() => {
    const productosRef = ref(db, "productos");
    onValue(productosRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return setProductos([]);

      const lista = Object.entries(data).map(([id, value]) => ({
        id,
        ...value
      }));

      setProductos(lista.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });
  }, []);

  // ================= FILTRO PRODUCTOS =================
  const productosFiltrados = productos.filter((p) =>
    vista === "activos" ? p.activo !== false : p.activo === false
  );

  const productosPorCategoria = useMemo(() => {
    return categorias.map((cat) => ({
      ...cat,
      productos: productosFiltrados.filter(
        (p) => p.categoriaId === cat.id
      )
    }));
  }, [categorias, productosFiltrados]);

  // ================= CREAR CATEGORÍA =================
  const crearCategoria = () => {
    if (!nuevaCategoria.trim()) return;

    push(ref(db, "categorias"), {
      nombre: nuevaCategoria,
      orden: categorias.length + 1,
      fechaCreacion: Date.now()
    });

    setNuevaCategoria("");
  };

  // ================= CREAR / EDITAR PRODUCTO =================
  const guardarProducto = () => {
    if (!nuevoProducto.nombre || !nuevoProducto.categoriaId) return;

    if (editandoProducto) {
      update(ref(db, `productos/${editandoProducto}`), {
        nombre: nuevoProducto.nombre,
        categoriaId: nuevoProducto.categoriaId
      });
      setEditandoProducto(null);
    } else {
      push(ref(db, "productos"), {
        codigoInterno: `PROD-${Date.now()}`,
        nombre: nuevoProducto.nombre,
        categoriaId: nuevoProducto.categoriaId,
        activo: true,
        fechaCreacion: Date.now()
      });
    }

    setNuevoProducto({ nombre: "", categoriaId: "" });
  };

  const toggleProducto = (id, estadoActual) => {
    update(ref(db, `productos/${id}`), {
      activo: estadoActual ? false : true
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">

      {/* ================= MENU ================= */}
      <div className="flex gap-4">
        <button
          onClick={() => setVista("activos")}
          className={`px-4 py-2 rounded-lg text-sm ${
            vista === "activos"
              ? "bg-blue-600"
              : "bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          Activos
        </button>

        <button
          onClick={() => setVista("inactivos")}
          className={`px-4 py-2 rounded-lg text-sm ${
            vista === "inactivos"
              ? "bg-red-600"
              : "bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          Inactivos
        </button>
      </div>

      {/* ================= NUEVO PRODUCTO ================= */}
      {vista === "activos" && (
        <div className="bg-zinc-900 p-4 md:p-6 rounded-2xl border border-zinc-800 space-y-4">
          <h2 className="text-lg font-semibold">
            {editandoProducto ? "Editar Producto" : "Nuevo Producto"}
          </h2>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Nombre del producto"
              value={nuevoProducto.nombre}
              onChange={(e) =>
                setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })
              }
              className="flex-1 bg-zinc-800 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            />

            <select
              value={nuevoProducto.categoriaId}
              onChange={(e) =>
                setNuevoProducto({ ...nuevoProducto, categoriaId: e.target.value })
              }
              className="flex-1 bg-zinc-800 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>

            <button
              onClick={guardarProducto}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* ================= NUEVA CATEGORIA ================= */}
      {vista === "activos" && (
        <div className="bg-zinc-900 p-4 md:p-6 rounded-2xl border border-zinc-800 space-y-4">
          <h2 className="text-lg font-semibold">Nueva Categoría</h2>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Nombre categoría"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              className="flex-1 bg-zinc-800 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
            />

            <button
              onClick={crearCategoria}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold"
            >
              Crear
            </button>
          </div>
        </div>
      )}

      {/* ================= LISTADO ================= */}
      {productosPorCategoria.map((cat) => (
        <div
          key={cat.id}
          className="bg-zinc-900 p-4 md:p-6 rounded-2xl border border-zinc-800"
        >
          <h3 className="font-semibold mb-4">{cat.nombre}</h3>

          {cat.productos.length === 0 && (
            <div className="text-zinc-500 text-sm">
              Sin productos
            </div>
          )}

          <div className="space-y-3">
            {cat.productos.map((prod) => (
              <div
                key={prod.id}
                className="bg-zinc-800 p-4 rounded-xl flex flex-col md:flex-row md:justify-between md:items-center gap-3"
              >
                <div>
                  <div className="font-medium">{prod.nombre}</div>
                  <div className="text-xs text-zinc-400">
                    {prod.codigoInterno}
                  </div>
                </div>

                <div className="flex gap-4 text-sm">
                  <button
                    onClick={() => {
                      setEditandoProducto(prod.id);
                      setNuevoProducto({
                        nombre: prod.nombre,
                        categoriaId: prod.categoriaId
                      });
                    }}
                    className="text-blue-400"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      toggleProducto(prod.id, prod.activo !== false)
                    }
                    className={`${
                      prod.activo !== false
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {prod.activo !== false
                      ? "Deshabilitar"
                      : "Habilitar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}