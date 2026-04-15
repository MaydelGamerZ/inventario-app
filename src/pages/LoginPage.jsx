import { useState } from "react";
import { Navigate } from "react-router-dom";
import { loginWithEmail, loginWithGoogle } from "../services/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { user, loadingAuth } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage("");

    if (!form.email.trim() || !form.password.trim()) {
      setErrorMessage("Completa correo y contraseña.");
      return;
    }

    try {
      setLoadingEmail(true);
      await loginWithEmail(form.email.trim(), form.password);
    } catch (error) {
      console.error(error);
      setErrorMessage("Correo o contraseña incorrectos.");
    } finally {
      setLoadingEmail(false);
    }
  }

  async function handleGoogleLogin() {
    setErrorMessage("");

    try {
      setLoadingGoogle(true);
      await loginWithGoogle();
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo iniciar sesión con Google.");
    } finally {
      setLoadingGoogle(false);
    }
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Sistema de Inventario</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Inicia sesión para entrar al panel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ejemplo@correo.com"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="********"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loadingEmail}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loadingEmail ? "Entrando..." : "Entrar con correo"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-500">o</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loadingGoogle}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-60"
        >
          {loadingGoogle ? "Conectando..." : "Entrar con Google"}
        </button>
      </div>
    </main>
  );
}