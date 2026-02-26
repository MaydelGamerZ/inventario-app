import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase/config";
import { ref, onValue, update, push, remove } from "firebase/database";

export default function InventarioDiario() {
  const fechaHoy = new Date().toLocaleDateString("en-CA"); 
// en-CA => formato YYYY-MM-DD en hora local

  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState({});
  const [categoriaAbierta, setCategoriaAbierta] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const [modoTarima, setModoTarima] = useState(false);

  const [conteoForm, setConteoForm] = useState({
    cantidad: "",
    pisos: "",
    cajas: "",
    unidades: "",
    sueltos: "",
    nota: ""
  });

  // ================= CARGAR CATEGORÍAS =================
  useEffect(() => {
    const catRef = ref(db, "categorias");
    onValue(catRef, (snap) => {
      const data = snap.val();
      if (!data) return setCategorias([]);
      const lista = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCategorias(lista.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    });
  }, []);

  // ================= CARGAR PRODUCTOS =================
  useEffect(() => {
    const prodRef = ref(db, "productos");
    onValue(prodRef, (snap) => {
      const data = snap.val();
      if (!data) return setProductos([]);
      const lista = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .filter((p) => p.activo);
      setProductos(lista);
    });
  }, []);

  // ================= CARGAR INVENTARIO =================
  useEffect(() => {
    const invRef = ref(db, `inventarios/${fechaHoy}/productos`);
    onValue(invRef, (snap) => setInventario(snap.val() || {}));
  }, [fechaHoy]);

  // ================= AGRUPAR =================
  const productosPorCategoria = useMemo(() => {
    return categorias.map((cat) => ({
      ...cat,
      productos: productos
        .filter((p) => p.categoriaId === cat.id)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    }));
  }, [categorias, productos]);

  // ================= TOTAL CONTADO =================
  const calcularTotal = (productoId) => {
    const conteos = inventario?.[productoId]?.conteos || {};
    return Object.values(conteos).reduce(
      (acc, c) => acc + (Number(c.cantidad) || 0),
      0
    );
  };

  // ================= GUARDAR ESPERADO =================
  const guardarEsperado = (productoId, valor) => {
    update(ref(db, `inventarios/${fechaHoy}/productos/${productoId}`), {
      stockEsperado: Number(valor) || 0
    });
  };

  // ================= ABRIR DRAWER =================
  const abrirDrawer = (producto) => {
    setProductoSeleccionado(producto);
    setDrawerOpen(true);
    setModoTarima(false);
    setConteoForm({
      cantidad: "",
      pisos: "",
      cajas: "",
      unidades: "",
      sueltos: "",
      nota: ""
    });
  };

  // ================= PREVIEW TARIMA =================
  const previewTarima = useMemo(() => {
    if (!modoTarima) return 0;
    const pisos = Number(conteoForm.pisos) || 0;
    const cajas = Number(conteoForm.cajas) || 0;
    const unidades = Number(conteoForm.unidades) || 0;
    const sueltos = Number(conteoForm.sueltos) || 0;
    return pisos * cajas * unidades + sueltos;
  }, [modoTarima, conteoForm]);

  // ================= GUARDAR CONTEO =================
  const guardarConteo = () => {
    if (!productoSeleccionado) return;

    const cantidadFinal = modoTarima
      ? previewTarima
      : Number(conteoForm.cantidad) || 0;

    if (cantidadFinal <= 0) return;

    push(
      ref(
        db,
        `inventarios/${fechaHoy}/productos/${productoSeleccionado.id}/conteos`
      ),
      {
        cantidad: cantidadFinal,
        nota: conteoForm.nota || "",
        fecha: Date.now()
      }
    );

    setConteoForm({
      cantidad: "",
      pisos: "",
      cajas: "",
      unidades: "",
      sueltos: "",
      nota: ""
    });
  };

  return (
    <div className="relative p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-semibold mb-6">
        Inventario Diario - {fechaHoy}
      </h2>

      {/* ================= CATEGORÍAS ================= */}
      <div className="space-y-4">
        {productosPorCategoria.map((cat) => (
          <div
            key={cat.id}
            className="bg-zinc-900 rounded-xl border border-zinc-800"
          >
            <button
              onClick={() =>
                setCategoriaAbierta(categoriaAbierta === cat.id ? null : cat.id)
              }
              className="w-full text-left p-4 font-semibold border-b border-zinc-800"
            >
              {cat.nombre}
            </button>

            {categoriaAbierta === cat.id && (
              <div className="p-4 space-y-4">
                {cat.productos.map((prod) => {
                  const total = calcularTotal(prod.id);
                  const esperado = inventario?.[prod.id]?.stockEsperado || 0;
                  const diferencia = total - esperado;

                  return (
                    <div
                      key={prod.id}
                      className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-4 md:p-5 rounded-xl border border-zinc-700 shadow-lg"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-start md:items-center">
                        {/* IZQUIERDA */}
                        <div>
                          <div className="text-lg font-semibold">
                            {prod.nombre}
                          </div>

                          <div className="text-xs text-zinc-400 mt-1">
                            ID: {prod.codigoInterno || prod.id}
                          </div>

                          <div className="mt-3">
                            <label className="text-xs text-zinc-400 block mb-1">
                              Stock Esperado
                            </label>
                            <input
                              type="number"
                              value={esperado}
                              onChange={(e) =>
                                guardarEsperado(prod.id, e.target.value)
                              }
                              className="bg-zinc-700 px-3 py-2 rounded-lg w-full md:w-28 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* CENTRO */}
                        <div className="text-left md:text-center">
                          <div className="text-3xl font-bold">{total}</div>
                          <div className="text-xs text-zinc-400 mt-1">
                            Total Contado
                          </div>
                          <div className="text-xs mt-2 text-zinc-500">
                            {
                              Object.keys(
                                inventario?.[prod.id]?.conteos || {}
                              ).length
                            }{" "}
                            conteos
                          </div>
                        </div>

                        {/* DERECHA */}
                        <div className="text-left md:text-right mt-4 md:mt-0">
                          <div
                            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                              diferencia === 0
                                ? "bg-green-600/20 text-green-400"
                                : diferencia > 0
                                ? "bg-blue-600/20 text-blue-400"
                                : "bg-red-600/20 text-red-400"
                            }`}
                          >
                            {diferencia > 0 ? "+" : ""}
                            {diferencia}
                          </div>

                          <div className="text-xs text-zinc-400 mt-1">
                            Diferencia
                          </div>

                          <button
                            onClick={() => abrirDrawer(prod)}
                            className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm w-full md:w-auto transition"
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

      {/* ================= DRAWER RESPONSIVE ================= */}
      {drawerOpen && productoSeleccionado && (
        <div className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-zinc-950 shadow-2xl p-4 md:p-6 z-50 overflow-y-auto border-l border-zinc-800">
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-sm text-zinc-400 mb-4"
          >
            Cerrar
          </button>

          {(() => {
            const conteos = inventario?.[productoSeleccionado.id]?.conteos || {};
            const lista = Object.entries(conteos).sort(
              (a, b) => b[1].fecha - a[1].fecha
            );

            const total = lista.reduce((acc, [, c]) => acc + c.cantidad, 0);
            const esperado =
              inventario?.[productoSeleccionado.id]?.stockEsperado || 0;
            const diferencia = total - esperado;

            return (
              <>
                {/* HEADER */}
                <div className="bg-zinc-900 p-4 rounded-xl mb-6 border border-zinc-800">
                  <h3 className="text-xl font-semibold">
                    {productoSeleccionado.nombre}
                  </h3>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-zinc-800 p-3 rounded-lg">
                      <div className="text-xs text-zinc-400">Esperado</div>
                      <div className="text-lg font-semibold">{esperado}</div>
                    </div>

                    <div className="bg-zinc-800 p-3 rounded-lg">
                      <div className="text-xs text-zinc-400">Contado</div>
                      <div className="text-lg font-semibold">{total}</div>
                    </div>

                    <div className="bg-zinc-800 p-3 rounded-lg">
                      <div className="text-xs text-zinc-400">Diferencia</div>
                      <div
                        className={`text-lg font-semibold ${
                          diferencia === 0
                            ? "text-green-500"
                            : diferencia > 0
                            ? "text-blue-400"
                            : "text-red-500"
                        }`}
                      >
                        {diferencia}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TABLA SCROLLABLE */}
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="text-zinc-400 border-b border-zinc-700">
                        <tr>
                          <th className="text-left pb-2">#</th>
                          <th className="text-left pb-2">Cantidad</th>
                          <th className="text-left pb-2">Nota</th>
                          <th className="text-left pb-2">Hora</th>
                          <th className="text-right pb-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map(([id, c], index) => (
                          <tr key={id} className="border-b border-zinc-800">
                            <td className="py-2">{index + 1}</td>
                            <td className="py-2 text-green-400">{c.cantidad}</td>
                            <td className="py-2">{c.nota}</td>
                            <td className="py-2 text-zinc-400">
                              {new Date(c.fecha).toLocaleTimeString()}
                            </td>
                            <td className="py-2 text-right">
                              <button
                                onClick={() =>
                                  remove(
                                    ref(
                                      db,
                                      `inventarios/${fechaHoy}/productos/${productoSeleccionado.id}/conteos/${id}`
                                    )
                                  )
                                }
                                className="bg-red-600 px-3 py-1 text-xs rounded hover:bg-red-700"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                        {lista.length === 0 && (
                          <tr>
                            <td
                              className="py-3 text-zinc-500"
                              colSpan={5}
                            >
                              Sin conteos todavía.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ✅ NUEVO CONTEO (EL QUE FALTABA) */}
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm text-zinc-400">Nuevo Conteo</h4>

                    <button
                      onClick={() => setModoTarima(!modoTarima)}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded"
                    >
                      {modoTarima ? "Modo Manual" : "Modo Tarima"}
                    </button>
                  </div>

                  {!modoTarima ? (
                    <input
                      type="number"
                      placeholder="Cantidad"
                      value={conteoForm.cantidad}
                      onChange={(e) =>
                        setConteoForm({ ...conteoForm, cantidad: e.target.value })
                      }
                      className="w-full bg-zinc-800 p-3 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Pisos"
                          value={conteoForm.pisos}
                          onChange={(e) =>
                            setConteoForm({ ...conteoForm, pisos: e.target.value })
                          }
                          className="bg-zinc-800 p-3 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                        <input
                          type="number"
                          placeholder="Cajas por piso"
                          value={conteoForm.cajas}
                          onChange={(e) =>
                            setConteoForm({ ...conteoForm, cajas: e.target.value })
                          }
                          className="bg-zinc-800 p-3 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                        <input
                          type="number"
                          placeholder="Unidades por caja"
                          value={conteoForm.unidades}
                          onChange={(e) =>
                            setConteoForm({
                              ...conteoForm,
                              unidades: e.target.value
                            })
                          }
                          className="bg-zinc-800 p-3 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                        <input
                          type="number"
                          placeholder="Sueltos"
                          value={conteoForm.sueltos}
                          onChange={(e) =>
                            setConteoForm({
                              ...conteoForm,
                              sueltos: e.target.value
                            })
                          }
                          className="bg-zinc-800 p-3 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                      </div>

                      <div className="mt-2 text-sm text-green-400">
                        Total calculado: {previewTarima}
                      </div>
                    </>
                  )}

                  <input
                    type="text"
                    placeholder="Nota / Ubicación"
                    value={conteoForm.nota}
                    onChange={(e) =>
                      setConteoForm({ ...conteoForm, nota: e.target.value })
                    }
                    className="w-full bg-zinc-800 p-3 rounded mt-2 mb-3 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />

                  <button
                    onClick={guardarConteo}
                    className="w-full bg-green-600 py-3 rounded hover:bg-green-700 font-semibold"
                  >
                    Guardar Conteo
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}