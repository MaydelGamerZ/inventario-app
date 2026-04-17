import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../layouts/AppLayout';
import HomePage from '../pages/HomePage';
import InventoryDayPage from '../pages/InventoryDayPage';
import InventoryDetailPage from '../pages/InventoryDetailPage';
import InventoryHistoryPage from '../pages/InventoryHistoryPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProductsPage from '../pages/ProductsPage';

/**
 * Router principal de la aplicación.
 * - Separa rutas públicas y privadas.
 * - Usa ProtectedRoute para todo el panel interno.
 * - Mantiene redirecciones limpias.
 * - Deja un fallback 404 tanto dentro como fuera del layout.
 */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas privadas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Inicio */}
          <Route index element={<HomePage />} />

          {/* Alias /home -> / */}
          <Route path="home" element={<Navigate to="/" replace />} />

          {/* Inventario */}
          <Route path="inventario-diario" element={<InventoryDayPage />} />
          <Route path="inventario/:id" element={<InventoryDetailPage />} />
          <Route path="inventario/:id/editar" element={<InventoryDetailPage />} />

          {/* Historial */}
          <Route path="historial" element={<InventoryHistoryPage />} />

          {/* Productos */}
          <Route path="productos" element={<ProductsPage />} />

          {/* 404 interno dentro del layout */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Fallback global */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}