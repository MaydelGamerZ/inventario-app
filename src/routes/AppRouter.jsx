import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../layouts/AppLayout';
import HomePage from '../pages/HomePage';
import InventoryDayPage from '../pages/InventoryDayPage';
import InventoryDetailPage from '../pages/InventoryDetailPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProductsPage from '../pages/ProductsPage';

function HistorialPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-3xl font-bold text-white">
          Historial de Inventarios
        </h1>
        <p className="mt-2 text-zinc-400">
          Aquí verás los inventarios guardados por fecha.
        </p>
      </section>
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
          <Route path="/productos" element={<ProductsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
