import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase/config";
import { ref, onValue } from "firebase/database";

export default function Historial() {
  const hoy = new Date().toLocaleDateString("en-CA");

  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoy);
  const [inventarioDia, setInventarioDia] = useState({});
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaAbierta, setCategoriaAbierta] = useState(null);

  const [productoDetalle, setProductoDetalle] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ================= CARGAR PRODUCTOS =================
  useEffect(() => {
    const prodRef = ref(db, "productos");
    onValue(prodRef, (snap) => {
      const data = snap.val();
      if (!data) return setProductos([]);
      const lista = Object.entries(data).map(([id, val]) => ({
        id,
        ...val
      }));
      setProductos(lista);
    });
  }, []);

  // ================= CARGAR CATEGORÍAS =================
  useEffect(() => {
    const catRef = ref(db, "categorias");
    onValue(catRef, (snap) => {
      const data = snap.val();
      if (!data) return setCategorias([]);
      const lista = Object.entries(data).map(([id, val]) => ({
        id,
        ...val
      }));
      setCategorias(lista);
    });
  }, []);

  // ================= CARGAR INVENTARIO POR FECHA =================
  useEffect(() => {
    const invRef = ref(db, `inventarios/${fechaSeleccionada}/productos`);
    onValue(invRef, (snap) => {
      setInventarioDia(snap.val() || {});
    });
  }, [fechaSeleccionada]);

  // ================= AGRUPAR PRODUCTOS POR CATEGORÍA =================
  const productosPorCategoria = useMemo(() => {
    return categorias.map((cat) => ({
      ...cat,
      productos: productos.filter(
        (p) => p.categoriaId === cat.id && inventarioDia[p.id]
      )
    }));
  }, [categorias, productos, inventarioDia]);

  // ================= RESUMEN GENERAL =================
  const resumenGeneral = useMemo(() => {
    let totalUnidades = 0;
    let totalEsperado = 0;
    let totalProductos = 0;

    Object.values(inventarioDia).forEach((prod) => {
      const conteos = prod.conteos || {};
      const total = Object.values(conteos).reduce(
        (acc, c) => acc + (Number(c.cantidad) || 0),
        0
      );

      totalUnidades += total;
      totalEsperado += prod.stockEsperado || 0;
      totalProductos++;
    });

    return {
      totalUnidades,
      totalEsperado,
      diferencia: totalUnidades - totalEsperado,
      totalProductos
    };
  }, [inventarioDia]);

  return (
    <div className="p-6 relative">
      <h2 className="text-2xl font-semibold mb-2">
        Historial de Inventarios
      </h2>

      <p className="text-zinc-400 mb-6">
        Consulta el conteo general por fecha.
      </p>

      {/* ================= SELECTOR FECHA ================= */}
      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6">
        <label className="block text-sm text-zinc-400 mb-2">
          Seleccionar Fecha
        </label>

        <input
          type="date"
          value={fechaSeleccionada}
          onChange={(e) => setFechaSeleccionada(e.target.value)}
          className="bg-zinc-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ================= RESUMEN ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <ResumenCard title="Productos Contados" value={resumenGeneral.totalProductos} />
        <ResumenCard title="Unidades Contadas" value={resumenGeneral.totalUnidades} />
        <ResumenCard title="Stock Esperado" value={resumenGeneral.totalEsperado} />
        <ResumenCard
          title="Diferencia Total"
          value={resumenGeneral.diferencia}
          diferencia
        />
      </div>

      {/* ================= CATEGORÍAS ================= */}
      <div className="space-y-4">
        {productosPorCategoria.map((cat) => (
          <div
            key={cat.id}
            className="bg-zinc-900 rounded-xl border border-zinc-800"
          >
            <button
              onClick={() =>
                setCategoriaAbierta(
                  categoriaAbierta === cat.id ? null : cat.id
                )
              }
              className="w-full text-left p-4 font-semibold border-b border-zinc-800"
            >
              {cat.nombre}
            </button>

            {categoriaAbierta === cat.id && (
              <div className="p-4 space-y-4">
                {cat.productos.map((prod) => {
                  const data = inventarioDia[prod.id];
                  const conteos = data?.conteos || {};

                  const total = Object.values(conteos).reduce(
                    (acc, c) => acc + (Number(c.cantidad) || 0),
                    0
                  );

                  const esperado = data?.stockEsperado || 0;
                  const diferencia = total - esperado;

                  return (
                    <div
                      key={prod.id}
                      className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-5 rounded-xl border border-zinc-700"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

                        {/* IZQUIERDA */}
                        <div>
                          <div className="text-lg font-semibold">
                            {prod.nombre}
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">
                            {Object.keys(conteos).length} conteos
                          </div>
                        </div>

                        {/* CENTRO */}
                        <div className="text-left md:text-center">
                          <div className="text-3xl font-bold">
                            {total}
                          </div>
                          <div className="text-xs text-zinc-400">
                            Total Contado
                          </div>
                        </div>

                        {/* DERECHA */}
                        <div className="text-left md:text-right">
                          <div className="text-sm">
                            Esperado: {esperado}
                          </div>
                          <div
                            className={`text-sm font-semibold ${
                              diferencia === 0
                                ? "text-green-400"
                                : diferencia > 0
                                ? "text-blue-400"
                                : "text-red-400"
                            }`}
                          >
                            Diferencia: {diferencia}
                          </div>

                          <button
                            onClick={() => {
                              setProductoDetalle({ producto: prod, data });
                              setDrawerOpen(true);
                            }}
                            className="mt-3 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
                          >
                            Ver Historial
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ================= DRAWER DETALLE ================= */}
      {drawerOpen && productoDetalle && (
        <div className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-zinc-950 shadow-2xl p-6 z-50 overflow-y-auto border-l border-zinc-800">

          <button
            onClick={() => setDrawerOpen(false)}
            className="text-sm text-zinc-400 mb-4"
          >
            Cerrar
          </button>

          {(() => {
            const { producto, data } = productoDetalle;
            const conteos = data?.conteos || {};

            const lista = Object.entries(conteos).sort(
              (a, b) => b[1].fecha - a[1].fecha
            );

            return (
              <>
                <div className="bg-zinc-900 p-4 rounded-xl mb-6 border border-zinc-800">
                  <h3 className="text-xl font-semibold">
                    {producto.nombre}
                  </h3>
                  <div className="text-sm text-zinc-400 mt-2">
                    {lista.length} conteos registrados
                  </div>
                </div>

                <div className="space-y-3">
                  {lista.length === 0 && (
                    <div className="text-zinc-500 text-sm">
                      No hay conteos registrados.
                    </div>
                  )}

                  {lista.map(([id, c]) => (
                    <div
                      key={id}
                      className="bg-zinc-800 p-4 rounded-lg border border-zinc-700"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-lg font-semibold text-green-400">
                            {c.cantidad}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {c.nota || "Sin nota"}
                          </div>
                        </div>

                        <div className="text-xs text-zinc-500">
                          {new Date(c.fecha).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ================= COMPONENTE RESUMEN =================
function ResumenCard({ title, value, diferencia }) {
  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      <div className="text-xs text-zinc-400">{title}</div>
      <div
        className={`text-xl font-semibold ${
          diferencia
            ? value === 0
              ? "text-green-500"
              : value > 0
              ? "text-blue-400"
              : "text-red-500"
            : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}