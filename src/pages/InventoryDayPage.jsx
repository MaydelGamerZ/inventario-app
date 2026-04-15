import { useEffect, useMemo, useState } from 'react';
import { Search, Save } from 'lucide-react';

export default function InventoryDayPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({
    total: 0,
    faltantes: 0,
    danados: 0,
    caducados: 0,
  });

  // 🔥 MOCK (luego se reemplaza con PDF o Firebase)
  useEffect(() => {
    const initialProducts = [
      {
        id: 1,
        name: 'ZUCARITAS 600 GRS',
        category: 'CEREALES',
        quantity: '',
        status: 'OK',
        obs: '',
      },
      {
        id: 2,
        name: 'CHOCO KRISPIS 290 GRS',
        category: 'CEREALES',
        quantity: '',
        status: 'OK',
        obs: '',
      },
      {
        id: 3,
        name: 'PRINGLES ORIGINAL 40 GRS',
        category: 'SNACKS',
        quantity: '',
        status: 'OK',
        obs: '',
      },
    ];

    setProducts(initialProducts);
  }, []);

  // 🧠 LÓGICA DE ESTADO AUTOMÁTICO
  function calculateStatus(qty, obs) {
    const num = Number(qty);

    if (obs.toLowerCase().includes('dañado')) return 'DAÑADO';
    if (obs.toLowerCase().includes('caducado')) return 'CADUCADO';
    if (!num || num === 0) return 'FALTANTE';
    return 'OK';
  }

  // 🔄 ACTUALIZAR PRODUCTO
  const updateProduct = (id, field, value) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const updated = { ...p, [field]: value };

        updated.status = calculateStatus(updated.quantity, updated.obs);

        return updated;
      })
    );
  };

  // 🔍 FILTRO
  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  // 📊 RESUMEN
  useEffect(() => {
    const total = products.length;
    const faltantes = products.filter((p) => p.status === 'FALTANTE').length;
    const danados = products.filter((p) => p.status === 'DAÑADO').length;
    const caducados = products.filter((p) => p.status === 'CADUCADO').length;

    setSummary({ total, faltantes, danados, caducados });
  }, [products]);

  // 🎨 COLORES
  function getColor(status) {
    switch (status) {
      case 'OK':
        return 'bg-emerald-900/30 text-emerald-400';
      case 'FALTANTE':
        return 'bg-red-900/30 text-red-400';
      case 'DAÑADO':
        return 'bg-zinc-800 text-zinc-300';
      case 'CADUCADO':
        return 'bg-yellow-900/30 text-yellow-400';
      default:
        return '';
    }
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="rounded-3xl bg-zinc-950 p-5 border border-zinc-800">
        <h1 className="text-3xl font-bold text-white">Inventario Diario</h1>
        <p className="text-zinc-400">Conteo físico del día</p>
      </div>

      {/* BUSCADOR */}
      <div className="flex items-center gap-3 rounded-2xl bg-zinc-950 p-4 border border-zinc-800">
        <Search className="text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent outline-none text-white"
        />
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 p-4 rounded-2xl">
          <p className="text-zinc-400 text-sm">Total</p>
          <p className="text-white text-xl font-bold">{summary.total}</p>
        </div>

        <div className="bg-red-900/30 p-4 rounded-2xl">
          <p className="text-red-400 text-sm">Faltantes</p>
          <p className="text-white text-xl font-bold">{summary.faltantes}</p>
        </div>

        <div className="bg-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-300 text-sm">Dañados</p>
          <p className="text-white text-xl font-bold">{summary.danados}</p>
        </div>

        <div className="bg-yellow-900/30 p-4 rounded-2xl">
          <p className="text-yellow-400 text-sm">Caducados</p>
          <p className="text-white text-xl font-bold">{summary.caducados}</p>
        </div>
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800"
          >
            <p className="text-white font-semibold">{p.name}</p>
            <p className="text-zinc-400 text-sm">{p.category}</p>

            {/* INPUT */}
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                placeholder="Cantidad"
                value={p.quantity}
                onChange={(e) =>
                  updateProduct(p.id, 'quantity', e.target.value)
                }
                className="flex-1 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-white"
              />

              <input
                type="text"
                placeholder="Observación"
                value={p.obs}
                onChange={(e) => updateProduct(p.id, 'obs', e.target.value)}
                className="flex-1 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            {/* ESTADO */}
            <div
              className={`mt-3 inline-block px-3 py-1 rounded-xl text-sm font-semibold ${getColor(p.status)}`}
            >
              {p.status}
            </div>
          </div>
        ))}
      </div>

      {/* BOTÓN GUARDAR */}
      <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-semibold">
        <Save size={18} />
        Guardar inventario
      </button>
    </div>
  );
}
