import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { parseInventoryPDF } from '../services/pdfInventoryParser';

export default function ImportPDFPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setLoading(true);
    setError('');

    try {
      const result = await parseInventoryPDF(selected);
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Error al procesar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <h1 className="text-3xl font-bold text-white">
          Importar Inventario PDF
        </h1>
        <p className="text-zinc-400">
          Sube el PDF y el sistema detectará productos automáticamente.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700 bg-black p-6 text-zinc-400 hover:border-blue-500">
          <Upload />
          Subir PDF
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFile}
            hidden
          />
        </label>
      </div>

      {loading && <div className="text-zinc-400">Procesando PDF...</div>}

      {error && <div className="text-red-400">{error}</div>}

      {data && (
        <div className="space-y-4">
          <div className="text-white font-bold">
            Categorías detectadas: {data.categories.length}
          </div>

          {data.categories.map((cat, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-800 p-4 bg-black"
            >
              <h2 className="text-blue-400 font-semibold">{cat.name}</h2>

              <div className="mt-2 space-y-1 text-sm text-zinc-300">
                {cat.products.slice(0, 10).map((p, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{p.name}</span>
                    <span>{p.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
