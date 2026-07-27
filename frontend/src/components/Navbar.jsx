import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const linkClasses = ({ isActive }) =>
  `px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "text-copper" : "text-paper/70 hover:text-paper"
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-blueprint sticky top-0 z-40 border-b border-blueprint-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2 font-display text-lg font-bold text-paper">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-copper text-paper">CO</span>
          ConectaOficios
        </NavLink>

        <nav className="flex items-center gap-1">
          <NavLink to="/buscar" className={linkClasses}>
            Buscar profesionales
          </NavLink>
          <NavLink to="/soy-profesional" className={linkClasses}>
            Soy profesional
          </NavLink>

          {user?.role === "profesional" && (
            <NavLink to="/mi-perfil" className={linkClasses}>
              Mi solicitud
            </NavLink>
          )}

          {user?.role === "admin" && (
            <NavLink to="/admin" className={linkClasses}>
              Panel admin
            </NavLink>
          )}

          {user ? (
            <button
              onClick={logout}
              className="ml-2 rounded-sm border border-blueprint-line px-3 py-2 text-sm text-paper/80 hover:border-copper hover:text-copper"
            >
              Salir ({user.email})
            </button>
          ) : (
            <NavLink
              to="/admin-login"
              className="ml-2 rounded-sm border border-blueprint-line px-3 py-2 text-sm text-paper/50 hover:border-copper hover:text-copper"
            >
              Ingreso admin
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
