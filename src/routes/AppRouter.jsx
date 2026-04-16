import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../layouts/AppLayout';
import HomePage from '../pages/HomePage';
import InventoryDayPage from '../pages/InventoryDayPage';
import InventoryDetailPage from '../pages/InventoryDetailPage';
import InventoryHistoryPage from '../pages/InventoryHistoryPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProductsPage from '../pages/ProductsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas */}
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

          {/* Redirección opcional si alguien entra a /home */}
          <Route path="home" element={<Navigate to="/" replace />} />

          {/* Inventario */}
          <Route path="inventario-diario" element={<InventoryDayPage />} />
          <Route path="inventario/:id" element={<InventoryDetailPage />} />
          <Route
            path="inventario/:id/editar"
            element={<InventoryDetailPage />}
          />

          {/* Historial */}
          <Route path="historial" element={<InventoryHistoryPage />} />

          {/* Productos */}
          <Route path="productos" element={<ProductsPage />} />
        </Route>

        {/* Ruta no encontrada */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
