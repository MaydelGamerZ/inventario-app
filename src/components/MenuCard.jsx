import { Link } from "react-router-dom";

export default function MenuCard({ title, description, to }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition duration-300 block"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 text-sm">{description}</p>
    </Link>
  );
}