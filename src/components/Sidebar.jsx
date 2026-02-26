import { Link, useLocation } from "react-router-dom";

export default function Sidebar({ open, setOpen }) {
  const location = useLocation();

  const menuItems = [
    { name: "Inventario Diario", path: "/inventario" },
    { name: "Historial de Inventarios", path: "/historial" },
    { name: "Productos / Categorías", path: "/productos" },
  ];

  return (
    <>
      {/* Overlay para móvil */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden"
        />
      )}

      <aside
        className={`
          fixed md:relative z-50
          w-64 h-full bg-zinc-900 shadow-xl
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-blue-500">
            INVENTARIO
          </h2>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`
                block px-4 py-3 rounded-lg transition
                ${
                  location.pathname === item.path
                    ? "bg-zinc-800 text-blue-500"
                    : "text-zinc-300 hover:bg-zinc-800"
                }
              `}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}