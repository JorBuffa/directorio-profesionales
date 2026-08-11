import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import InstalarAppModal from "./InstalarAppModal.jsx";
import isotipo from "../assets/isotipo.jpg";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-blueprint sticky top-0 z-40 border-b border-blueprint-line shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 flex-wrap gap-3">
        
        {/* LOGO E ISOTIPO */}
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

        {/* CENTRO / DERECHA: Botón de instalación centrado y acceso admin/salida discreto */}
        <div className="flex items-center justify-center flex-1 sm:justify-end gap-3 flex-wrap">
          
          {/* Botón central adaptativo de instalación */}
          <div className="flex justify-center my-1 sm:my-0">
            <InstalarAppModal />
          </div>

          {/* Acceso de administración / sesión de forma discreta */}
          <nav className="flex items-center">
            {user ? (
              <button
                onClick={logout}
                className="rounded-sm border border-blueprint-line px-3 py-1.5 text-xs text-paper/80 hover:border-copper hover:text-copper transition"
              >
                Salir ({user.email})
              </button>
            ) : (
              <NavLink
                to="/admin-login"
                className="rounded-sm border border-blueprint-line px-3 py-1.5 text-xs text-paper/40 hover:border-copper hover:text-copper transition"
              >
                Ingreso admin
              </NavLink>
            )}
          </nav>
        </div>

      </div>
    </header>
  );
}