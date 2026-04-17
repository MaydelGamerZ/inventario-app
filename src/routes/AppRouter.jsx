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
 * - Usa un 404 dentro del layout para rutas privadas inválidas
 *   y un 404 global para cualquier otra ruta fuera del panel.
 */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />

        {/* Privadas */}
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

          {/* Alias */}
          <Route path="home" element={<Navigate to="/" replace />} />

          {/* Inventario diario */}
          <Route path="inventario-diario" element={<InventoryDayPage />} />

          {/* Historial */}
          <Route path="historial" element={<InventoryHistoryPage />} />

          {/* Productos / categorías */}
          <Route path="productos" element={<ProductsPage />} />

          {/* Inventario detalle / edición */}
          <Route path="inventario/:id" element={<InventoryDetailPage />} />
          <Route
            path="inventario/:id/editar"
            element={<InventoryDetailPage />}
          />

          {/* 404 dentro del panel */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* 404 fuera del panel */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
