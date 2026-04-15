import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="mt-3 text-zinc-400">La página no existe.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 transition"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
