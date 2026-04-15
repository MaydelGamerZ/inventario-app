import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import AppLayout from "../layouts/AppLayout.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import HomePage from "../pages/HomePage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import InventoryDayPage from "../pages/InventoryDayPage.jsx";
import InventoryDetailPage from "../pages/InventoryDetailPage.jsx";

/**
 * Defines all application routes, including protected routes that require
 * authentication. Wraps each protected page in the AppLayout.
 */
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