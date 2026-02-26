import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { ref, onValue } from "firebase/database";
import { Link } from "react-router-dom";

export default function Home() {
  const fechaHoy = new Date().toISOString().split("T")[0];

  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState({});

  // Cargar productos
  useEffect(() => {
    const productosRef = ref(db, "productos");
    onValue(productosRef, (snap) => {
      const data = snap.val();
      if (!data) return setProductos([]);
      const lista = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .filter((p) => p.activo);
      setProductos(lista);
    });
  }, []);

  // Cargar inventario del día
  useEffect(() => {
    const invRef = ref(db, `inventarios/${fechaHoy}/productos`);
    onValue(invRef, (snap) => {
      setInventario(snap.val() || {});
    });
  }, []);

  // KPIs
  const totalProductos = productos.length;

  const totalConteosHoy = Object.values(inventario).reduce(
    (acc, prod) =>
      acc +
      Object.keys(prod?.conteos || {}).length,
    0
  );

  const totalUnidadesHoy = Object.values(inventario).reduce(
    (acc, prod) =>
      acc +
      Object.values(prod?.conteos || {}).reduce(
        (a, c) => a + (c.cantidad || 0),
        0
      ),
    0
  );

  return (
    <div className="p-6 space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>
        <p className="text-zinc-400 mt-1">
          Resumen general del sistema • {fechaHoy}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-3">

        <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 border border-blue-700/40 p-6 rounded-2xl">
          <div className="text-sm text-blue-400">
            Productos Activos
          </div>
          <div className="text-3xl font-bold mt-2">
            {totalProductos}
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-600/20 to-green-800/20 border border-green-700/40 p-6 rounded-2xl">
          <div className="text-sm text-green-400">
            Conteos Hoy
          </div>
          <div className="text-3xl font-bold mt-2">
            {totalConteosHoy}
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 border border-purple-700/40 p-6 rounded-2xl">
          <div className="text-sm text-purple-400">
            Unidades Contadas Hoy
          </div>
          <div className="text-3xl font-bold mt-2">
            {totalUnidadesHoy}
          </div>
        </div>

      </div>

      {/* ACCESOS PRINCIPALES */}
      <div className="grid gap-6 md:grid-cols-3">

        <Link
          to="/inventario"
          className="group bg-zinc-900 p-6 rounded-2xl border border-zinc-800 hover:border-blue-500 hover:shadow-xl transition"
        >
          <div className="text-xl font-semibold mb-2 group-hover:text-blue-400">
            📦 Inventario Diario
          </div>
          <p className="text-zinc-400 text-sm">
            Gestiona el conteo del día actual.
          </p>
        </Link>

        <Link
          to="/historial"
          className="group bg-zinc-900 p-6 rounded-2xl border border-zinc-800 hover:border-green-500 hover:shadow-xl transition"
        >
          <div className="text-xl font-semibold mb-2 group-hover:text-green-400">
            📊 Historial
          </div>
          <p className="text-zinc-400 text-sm">
            Consulta inventarios anteriores por fecha.
          </p>
        </Link>

        <Link
          to="/productos"
          className="group bg-zinc-900 p-6 rounded-2xl border border-zinc-800 hover:border-purple-500 hover:shadow-xl transition"
        >
          <div className="text-xl font-semibold mb-2 group-hover:text-purple-400">
            🗂 Productos
          </div>
          <p className="text-zinc-400 text-sm">
            Administra categorías y productos.
          </p>
        </Link>

      </div>

    </div>
  );
}