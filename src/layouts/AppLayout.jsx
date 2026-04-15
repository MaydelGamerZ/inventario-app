import Sidebar from "../components/Sidebar.jsx";

/**
 * Layout component that wraps pages with a sidebar. It provides a
 * responsive layout where the sidebar appears on the left and the
 * main content on the right.
 */
export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-black text-white md:flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 bg-zinc-950">{children}</main>
    </div>
  );
}