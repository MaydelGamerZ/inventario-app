import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

// Entry point for the React application. Wraps the entire app in the
// AuthProvider so authentication state is available throughout.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
