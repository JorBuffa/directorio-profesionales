import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import isotipo from "../assets/isotipo.jpg"; // Asegurate que la imagen esté en src/assets/isotipo.jpg (o .png)

const linkClasses = ({ isActive }) =>
  `px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "text-copper" : "text-paper/70 hover:text-paper"
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-blueprint sticky top-0 z-40 border-b border-blueprint-line shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        
        {/* LOGO E ISOTIPO ADAPTADO */}
        <NavLink to="/" className="flex items-center gap-3 font-display text-lg font-bold text-paper group">
          <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center p-1 shadow-inner border border-copper/40 overflow-hidden">
            <img 
              src={isotipo} 
              alt="ConectaOficios Isotipo" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="group-hover:text-copper transition">
            ConectaOficios
          </span>
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