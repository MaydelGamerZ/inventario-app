import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../layouts/AppLayout';
import HomePage from '../pages/HomePage';
import InventoryDayPage from '../pages/InventoryDayPage';
import InventoryDetailPage from '../pages/InventoryDetailPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';

function HistorialPage() {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-bold">Historial de Inventarios</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Aquí irá el historial de inventarios guardados.
      </p>
    </div>
  );
}

function ProductosPage() {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-bold">Productos / Categorías</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Aquí irá el catálogo de productos y categorías.
      </p>
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/inventario-diario" element={<InventoryDayPage />} />
          <Route path="/inventario/:id" element={<InventoryDetailPage />} />
          <Route path="/historial" element={<HistorialPage />} />
          <Route path="/productos" element={<ProductosPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
