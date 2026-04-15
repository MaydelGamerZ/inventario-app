import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import InventoryDayPage from '../pages/InventoryDayPage';
import InventoryDetailPage from '../pages/InventoryDetailPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <HomePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventario-diario"
          element={
            <ProtectedRoute>
              <AppLayout>
                <InventoryDayPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventario/:inventoryId"
          element={
            <ProtectedRoute>
              <AppLayout>
                <InventoryDetailPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
