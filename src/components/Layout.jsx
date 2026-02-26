import { useState } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">

      <Sidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col">

        {/* Header */}
        <header className="h-16 bg-zinc-900 flex items-center px-4 shadow-md">
          <button
            onClick={() => setOpen(!open)}
            className="text-zinc-300 text-2xl md:hidden"
          >
            ☰
          </button>

          <h1 className="ml-4 text-lg md:text-xl font-semibold">
            Sistema de Inventario
          </h1>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>

      </div>
    </div>
  );
}