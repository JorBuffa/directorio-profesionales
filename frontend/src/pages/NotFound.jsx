import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-mono text-copper">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">Página no encontrada</h1>
      <Link to="/" className="mt-4 inline-block text-taller hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
